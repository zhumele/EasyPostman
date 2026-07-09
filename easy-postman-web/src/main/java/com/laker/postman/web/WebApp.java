package com.laker.postman.web;

import cn.hutool.json.JSONObject;
import cn.hutool.json.JSONUtil;
import com.laker.postman.common.constants.AppConstants;
import com.laker.postman.http.runtime.app.AppHttpRuntimeBootstrap;
import com.laker.postman.ioc.BeanFactory;
import com.laker.postman.plugin.runtime.PluginRuntime;
import com.laker.postman.util.SystemUtil;
import com.laker.postman.web.api.CollectionController;
import com.laker.postman.web.api.EnvironmentController;
import com.laker.postman.web.api.HealthController;
import com.laker.postman.web.api.HistoryController;
import com.laker.postman.web.api.RequestController;
import com.laker.postman.web.api.WorkspaceController;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpHandler;
import com.sun.net.httpserver.HttpServer;
import lombok.extern.slf4j.Slf4j;

import java.io.*;
import java.net.InetSocketAddress;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.*;
import java.util.concurrent.Executors;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Slf4j
public class WebApp {

    private static HttpServer server;
    private static final List<Route> routes = new ArrayList<>();

    public static void main(String[] args) {
        try {
            configureDataDirectory();
            configureBaseRuntimeEnvironment();
            initBeanFactory();
            initPluginRuntime();
            registerRoutes();
            startServer();
            addShutdownHook();
        } catch (Exception e) {
            log.error("启动失败", e);
            System.exit(1);
        }
    }

    private static void configureDataDirectory() {
        String dataDir = System.getProperty("easyPostman.data.dir");
        if (dataDir == null || dataDir.isBlank()) {
            dataDir = Paths.get(".").toAbsolutePath().normalize().resolve("data").toString();
            System.setProperty("easyPostman.data.dir", dataDir);
        }
        log.info("数据目录: {}", SystemUtil.getEasyPostmanPath());
    }

    private static void configureBaseRuntimeEnvironment() {
        System.setProperty("java.net.useSystemProxies", "true");
        AppHttpRuntimeBootstrap.configure();
    }

    private static void initBeanFactory() {
        BeanFactory.init(AppConstants.BASE_PACKAGE);
        log.info("IOC 容器初始化完成");
    }

    private static void initPluginRuntime() {
        try {
            PluginRuntime.initialize();
            log.info("插件运行时初始化完成");
        } catch (Exception e) {
            log.warn("插件运行时初始化失败，继续启动: {}", e.getMessage());
        }
    }

    private static void registerRoutes() {
        HealthController.register(routes);
        CollectionController.register(routes);
        EnvironmentController.register(routes);
        RequestController.register(routes);
        WorkspaceController.register(routes);
        HistoryController.register(routes);
    }

    private static void startServer() throws IOException {
        int port = Integer.parseInt(System.getProperty("easyPostman.web.port", "18080"));
        server = HttpServer.create(new InetSocketAddress("0.0.0.0", port), 0);
        server.setExecutor(Executors.newFixedThreadPool(20));

        server.createContext("/api/", exchange -> {
            try {
                handleApiRequest(exchange);
            } catch (Exception e) {
                log.error("API 请求处理异常", e);
                sendJson(exchange, 500, Map.of("success", false, "message", e.getMessage()));
            }
        });

        server.createContext("/", WebApp::handleStaticFile);

        server.start();

        log.info("==============================================");
        log.info("  EasyPostman Web 服务已启动");
        log.info("  访问地址: http://localhost:{}", port);
        log.info("  数据目录: {}", SystemUtil.getEasyPostmanPath());
        log.info("==============================================");
    }

    private static void handleApiRequest(HttpExchange exchange) throws IOException {
        String method = exchange.getRequestMethod();
        String path = exchange.getRequestURI().getPath();

        addCorsHeaders(exchange);

        if ("OPTIONS".equalsIgnoreCase(method)) {
            exchange.sendResponseHeaders(204, -1);
            return;
        }

        for (Route route : routes) {
            if (route.method.equalsIgnoreCase(method)) {
                Matcher matcher = route.pattern.matcher(path);
                if (matcher.matches()) {
                    Map<String, String> pathParams = new HashMap<>();
                    for (int i = 0; i < route.paramNames.size(); i++) {
                        pathParams.put(route.paramNames.get(i), decode(matcher.group(i + 1)));
                    }
                    try {
                        route.handler.handle(exchange, pathParams);
                    } catch (Exception e) {
                        log.error("路由处理异常: {}", path, e);
                        sendJson(exchange, 500, Map.of("success", false, "message", e.getMessage()));
                    }
                    return;
                }
            }
        }

        sendJson(exchange, 404, Map.of("success", false, "message", "Not Found: " + path));
    }

    private static void handleStaticFile(HttpExchange exchange) throws IOException {
        String method = exchange.getRequestMethod();
        if (!"GET".equalsIgnoreCase(method) && !"HEAD".equalsIgnoreCase(method)) {
            exchange.sendResponseHeaders(405, -1);
            return;
        }

        String path = exchange.getRequestURI().getPath();
        if ("/".equals(path)) {
            path = "/index.html";
        }

        Path webDir = Paths.get("web-dist");
        Path filePath = webDir.resolve(path.substring(1)).normalize();

        if (!filePath.startsWith(webDir.normalize())) {
            exchange.sendResponseHeaders(403, -1);
            return;
        }

        if (Files.exists(filePath) && !Files.isDirectory(filePath)) {
            sendFile(exchange, filePath);
        } else {
            Path indexPath = webDir.resolve("index.html");
            if (Files.exists(indexPath)) {
                sendFile(exchange, indexPath);
            } else {
                sendJson(exchange, 200, Map.of(
                        "status", "ok",
                        "app", "EasyPostman Web",
                        "message", "前端资源未部署，请先构建前端项目"
                ));
            }
        }
    }

    private static void sendFile(HttpExchange exchange, Path filePath) throws IOException {
        String contentType = getContentType(filePath.toString());
        exchange.getResponseHeaders().set("Content-Type", contentType);
        long length = Files.size(filePath);
        exchange.sendResponseHeaders(200, length);
        try (OutputStream os = exchange.getResponseBody();
             InputStream is = Files.newInputStream(filePath)) {
            byte[] buf = new byte[8192];
            int len;
            while ((len = is.read(buf)) != -1) {
                os.write(buf, 0, len);
            }
        }
    }

    private static String getContentType(String path) {
        if (path.endsWith(".html")) return "text/html; charset=utf-8";
        if (path.endsWith(".js")) return "application/javascript; charset=utf-8";
        if (path.endsWith(".css")) return "text/css; charset=utf-8";
        if (path.endsWith(".json")) return "application/json; charset=utf-8";
        if (path.endsWith(".svg")) return "image/svg+xml";
        if (path.endsWith(".png")) return "image/png";
        if (path.endsWith(".jpg") || path.endsWith(".jpeg")) return "image/jpeg";
        if (path.endsWith(".gif")) return "image/gif";
        if (path.endsWith(".ico")) return "image/x-icon";
        if (path.endsWith(".woff")) return "font/woff";
        if (path.endsWith(".woff2")) return "font/woff2";
        if (path.endsWith(".ttf")) return "font/ttf";
        return "application/octet-stream";
    }

    private static void addCorsHeaders(HttpExchange exchange) {
        exchange.getResponseHeaders().set("Access-Control-Allow-Origin", "*");
        exchange.getResponseHeaders().set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS, PATCH");
        exchange.getResponseHeaders().set("Access-Control-Allow-Headers", "*");
        exchange.getResponseHeaders().set("Access-Control-Max-Age", "3600");
    }

    public static void sendJson(HttpExchange exchange, int status, Object data) throws IOException {
        addCorsHeaders(exchange);
        byte[] body = JSONUtil.toJsonStr(data).getBytes(StandardCharsets.UTF_8);
        exchange.getResponseHeaders().set("Content-Type", "application/json; charset=utf-8");
        exchange.sendResponseHeaders(status, body.length);
        try (OutputStream os = exchange.getResponseBody()) {
            os.write(body);
        }
    }

    public static <T> T parseBody(HttpExchange exchange, Class<T> clazz) throws IOException {
        try (InputStream is = exchange.getRequestBody()) {
            String body = new String(is.readAllBytes(), StandardCharsets.UTF_8);
            if (body.isBlank()) {
                try {
                    return clazz.getDeclaredConstructor().newInstance();
                } catch (Exception e) {
                    return null;
                }
            }
            return JSONUtil.toBean(body, clazz);
        }
    }

    public static String readBody(HttpExchange exchange) throws IOException {
        try (InputStream is = exchange.getRequestBody()) {
            return new String(is.readAllBytes(), StandardCharsets.UTF_8);
        }
    }

    public static Map<String, String> parseQuery(HttpExchange exchange) {
        Map<String, String> params = new HashMap<>();
        String query = exchange.getRequestURI().getQuery();
        if (query != null && !query.isBlank()) {
            for (String pair : query.split("&")) {
                int idx = pair.indexOf('=');
                if (idx > 0) {
                    params.put(decode(pair.substring(0, idx)), decode(pair.substring(idx + 1)));
                } else {
                    params.put(decode(pair), "");
                }
            }
        }
        return params;
    }

    private static String decode(String s) {
        try {
            return URLDecoder.decode(s, StandardCharsets.UTF_8);
        } catch (Exception e) {
            return s;
        }
    }

    private static void addShutdownHook() {
        Runtime.getRuntime().addShutdownHook(new Thread(() -> {
            if (server != null) {
                server.stop(0);
            }
            BeanFactory.destroy();
            log.info("EasyPostman Web 服务已停止");
        }));
    }

    @FunctionalInterface
    public interface RouteHandler {
        void handle(HttpExchange exchange, Map<String, String> pathParams) throws Exception;
    }

    public static class Route {
        final String method;
        final Pattern pattern;
        final List<String> paramNames;
        final RouteHandler handler;

        public Route(String method, String pathPattern, RouteHandler handler) {
            this.method = method;
            this.paramNames = new ArrayList<>();
            Pattern p = Pattern.compile("\\{([^}]+)}");
            Matcher m = p.matcher(pathPattern);
            StringBuffer sb = new StringBuffer();
            while (m.find()) {
                paramNames.add(m.group(1));
                m.appendReplacement(sb, "([^/]+)");
            }
            m.appendTail(sb);
            this.pattern = Pattern.compile("^" + sb + "$");
            this.handler = handler;
        }
    }
}
