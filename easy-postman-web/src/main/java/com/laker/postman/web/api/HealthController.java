package com.laker.postman.web.api;

import com.laker.postman.util.SystemUtil;
import com.laker.postman.web.WebApp;
import com.sun.net.httpserver.HttpExchange;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

public class HealthController {

    public static void register(List<WebApp.Route> routes) {
        routes.add(new WebApp.Route("GET", "/api/health", HealthController::health));
        routes.add(new WebApp.Route("GET", "/api/health/info", HealthController::info));
    }

    static void health(HttpExchange exchange, Map<String, String> pathParams) throws Exception {
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("status", "ok");
        result.put("timestamp", System.currentTimeMillis());
        WebApp.sendJson(exchange, 200, result);
    }

    static void info(HttpExchange exchange, Map<String, String> pathParams) throws Exception {
        Map<String, Object> info = new LinkedHashMap<>();
        info.put("app", "EasyPostman Web");
        info.put("version", SystemUtil.getCurrentVersion());
        info.put("dataDir", SystemUtil.getEasyPostmanPath());
        info.put("os", System.getProperty("os.name"));
        info.put("javaVersion", System.getProperty("java.version"));
        WebApp.sendJson(exchange, 200, info);
    }
}
