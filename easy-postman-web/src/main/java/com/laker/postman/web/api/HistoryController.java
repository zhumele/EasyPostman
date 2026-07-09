package com.laker.postman.web.api;

import com.laker.postman.history.RequestHistoryItem;
import com.laker.postman.ioc.BeanFactory;
import com.laker.postman.service.HistoryPersistenceService;
import com.laker.postman.web.WebApp;
import com.sun.net.httpserver.HttpExchange;
import lombok.extern.slf4j.Slf4j;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Slf4j
public class HistoryController {

    private static HistoryPersistenceService historyService;

    public static void register(List<WebApp.Route> routes) {
        routes.add(new WebApp.Route("GET", "/api/history", HistoryController::getHistory));
        routes.add(new WebApp.Route("DELETE", "/api/history", HistoryController::clearHistory));
    }

    private static HistoryPersistenceService getService() {
        if (historyService == null) {
            historyService = BeanFactory.getBean(HistoryPersistenceService.class);
        }
        return historyService;
    }

    static void getHistory(HttpExchange exchange, Map<String, String> pathParams) throws Exception {
        try {
            List<RequestHistoryItem> history = getService().getHistory();
            Map<String, Object> result = new LinkedHashMap<>();
            result.put("success", true);
            result.put("data", history);
            WebApp.sendJson(exchange, 200, result);
        } catch (Exception e) {
            log.error("获取历史记录失败", e);
            WebApp.sendJson(exchange, 500, Map.of("success", false, "message", e.getMessage()));
        }
    }

    static void clearHistory(HttpExchange exchange, Map<String, String> pathParams) throws Exception {
        try {
            getService().clearHistory();
            WebApp.sendJson(exchange, 200, Map.of("success", true));
        } catch (Exception e) {
            log.error("清空历史记录失败", e);
            WebApp.sendJson(exchange, 500, Map.of("success", false, "message", e.getMessage()));
        }
    }
}