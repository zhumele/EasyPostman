package com.laker.postman.web.api;

import com.laker.postman.model.Environment;
import com.laker.postman.service.EnvironmentService;
import com.laker.postman.web.WebApp;
import com.sun.net.httpserver.HttpExchange;
import lombok.extern.slf4j.Slf4j;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Slf4j
public class EnvironmentController {

    public static void register(List<WebApp.Route> routes) {
        routes.add(new WebApp.Route("GET", "/api/environments", EnvironmentController::getAll));
        routes.add(new WebApp.Route("POST", "/api/environments", EnvironmentController::create));
        routes.add(new WebApp.Route("PUT", "/api/environments/{id}", EnvironmentController::update));
        routes.add(new WebApp.Route("DELETE", "/api/environments/{id}", EnvironmentController::delete));
        routes.add(new WebApp.Route("POST", "/api/environments/{id}/activate", EnvironmentController::activate));
    }

    static void getAll(HttpExchange exchange, Map<String, String> pathParams) throws Exception {
        try {
            List<Environment> envs = EnvironmentService.getAllEnvironments();
            Environment active = EnvironmentService.getActiveEnvironment();
            Map<String, Object> result = new LinkedHashMap<>();
            result.put("success", true);
            result.put("data", envs);
            result.put("activeId", active != null ? active.getId() : "");
            WebApp.sendJson(exchange, 200, result);
        } catch (Exception e) {
            log.error("获取环境列表失败", e);
            WebApp.sendJson(exchange, 500, Map.of("success", false, "message", e.getMessage()));
        }
    }

    static void create(HttpExchange exchange, Map<String, String> pathParams) throws Exception {
        try {
            Environment env = WebApp.parseBody(exchange, Environment.class);
            if (env.getId() == null || env.getId().isBlank()) {
                env.setId(java.util.UUID.randomUUID().toString());
            }
            EnvironmentService.saveEnvironment(env);
            Map<String, Object> result = new LinkedHashMap<>();
            result.put("success", true);
            result.put("data", env);
            WebApp.sendJson(exchange, 200, result);
        } catch (Exception e) {
            log.error("创建环境失败", e);
            WebApp.sendJson(exchange, 500, Map.of("success", false, "message", e.getMessage()));
        }
    }

    static void update(HttpExchange exchange, Map<String, String> pathParams) throws Exception {
        try {
            String id = pathParams.get("id");
            Environment env = WebApp.parseBody(exchange, Environment.class);
            env.setId(id);
            EnvironmentService.saveEnvironment(env);
            WebApp.sendJson(exchange, 200, Map.of("success", true));
        } catch (Exception e) {
            log.error("更新环境失败", e);
            WebApp.sendJson(exchange, 500, Map.of("success", false, "message", e.getMessage()));
        }
    }

    static void delete(HttpExchange exchange, Map<String, String> pathParams) throws Exception {
        try {
            String id = pathParams.get("id");
            EnvironmentService.deleteEnvironment(id);
            WebApp.sendJson(exchange, 200, Map.of("success", true));
        } catch (Exception e) {
            log.error("删除环境失败", e);
            WebApp.sendJson(exchange, 500, Map.of("success", false, "message", e.getMessage()));
        }
    }

    static void activate(HttpExchange exchange, Map<String, String> pathParams) throws Exception {
        try {
            String id = pathParams.get("id");
            EnvironmentService.setActiveEnvironment(id);
            WebApp.sendJson(exchange, 200, Map.of("success", true));
        } catch (Exception e) {
            log.error("激活环境失败", e);
            WebApp.sendJson(exchange, 500, Map.of("success", false, "message", e.getMessage()));
        }
    }
}
