package com.laker.postman.web.api;

import cn.hutool.json.JSONObject;
import cn.hutool.json.JSONUtil;
import com.laker.postman.http.runtime.mapper.PreparedRequestMapper;
import com.laker.postman.http.runtime.model.HttpResponse;
import com.laker.postman.http.runtime.model.PreparedRequest;
import com.laker.postman.http.runtime.redirect.HttpRedirectExecutor;
import com.laker.postman.ioc.BeanFactory;
import com.laker.postman.model.Environment;
import com.laker.postman.request.model.HttpHeader;
import com.laker.postman.request.model.HttpRequestItem;
import com.laker.postman.service.EnvironmentService;
import com.laker.postman.service.HistoryPersistenceService;
import com.laker.postman.web.WebApp;
import com.sun.net.httpserver.HttpExchange;
import lombok.extern.slf4j.Slf4j;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Slf4j
public class RequestController {

    private static final Pattern VAR_PATTERN = Pattern.compile("\\{\\{([^}]+)}}");
    private static final HttpRedirectExecutor redirectExecutor = new HttpRedirectExecutor();
    private static HistoryPersistenceService historyService;

    public static void register(List<WebApp.Route> routes) {
        routes.add(new WebApp.Route("POST", "/api/request/send", RequestController::sendRequest));
    }

    static void sendRequest(HttpExchange exchange, Map<String, String> pathParams) throws Exception {
        long startTime = System.currentTimeMillis();
        try {
            String body = WebApp.readBody(exchange);
            HttpRequestItem requestItem = JSONUtil.toBean(body, HttpRequestItem.class);

            Map<String, String> variables = buildVariableMap();
            PreparedRequest preparedReq = PreparedRequestMapper.map(requestItem, key -> resolveVariable(key, variables));

            HttpResponse response = redirectExecutor.executeWithRedirects(preparedReq, 10, null);

            long duration = System.currentTimeMillis() - startTime;
            
            if (historyService == null) {
                historyService = BeanFactory.getBean(HistoryPersistenceService.class);
            }
            historyService.addHistory(preparedReq, response, startTime);

            Map<String, Object> result = new LinkedHashMap<>();
            result.put("success", true);
            result.put("data", buildResponseVO(response, duration));
            WebApp.sendJson(exchange, 200, result);
        } catch (Exception e) {
            log.error("发送请求失败", e);
            Map<String, Object> result = new LinkedHashMap<>();
            result.put("success", false);
            result.put("message", e.getMessage());
            WebApp.sendJson(exchange, 500, result);
        }
    }

    private static Map<String, String> buildVariableMap() {
        Map<String, String> variables = new LinkedHashMap<>();
        try {
            Environment activeEnv = EnvironmentService.getActiveEnvironment();
            if (activeEnv != null) {
                variables.putAll(activeEnv.getVariables());
            }
        } catch (Exception e) {
            log.warn("加载环境变量失败", e);
        }
        return variables;
    }

    private static String resolveVariable(String value, Map<String, String> variables) {
        if (value == null) return null;
        Matcher matcher = VAR_PATTERN.matcher(value);
        StringBuffer sb = new StringBuffer();
        while (matcher.find()) {
            String varName = matcher.group(1).trim();
            String varValue = variables.getOrDefault(varName, "{{" + varName + "}}");
            matcher.appendReplacement(sb, Matcher.quoteReplacement(varValue));
        }
        matcher.appendTail(sb);
        return sb.toString();
    }

    private static Map<String, Object> buildResponseVO(HttpResponse response, long duration) {
        Map<String, Object> vo = new LinkedHashMap<>();
        vo.put("statusCode", response.code);
        vo.put("durationMs", duration);

        List<Map<String, Object>> headers = response.headers != null ?
                response.headers.entrySet().stream()
                        .map(entry -> {
                            Map<String, Object> header = new LinkedHashMap<>();
                            header.put("key", entry.getKey());
                            header.put("value", String.join(", ", entry.getValue()));
                            return header;
                        })
                        .toList() : List.of();
        vo.put("headers", headers);

        String contentType = headers.stream()
                .filter(h -> "content-type".equalsIgnoreCase((String) h.get("key")))
                .map(h -> (String) h.get("value"))
                .findFirst()
                .orElse("");
        vo.put("contentType", contentType);

        vo.put("body", response.body != null ? response.body : "");

        return vo;
    }
}
