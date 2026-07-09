package com.laker.postman.web.api;

import com.laker.postman.common.constants.ConfigPathConstants;
import com.laker.postman.model.Workspace;
import com.laker.postman.service.EnvironmentService;
import com.laker.postman.service.WorkspaceService;
import com.laker.postman.web.WebApp;
import com.sun.net.httpserver.HttpExchange;
import lombok.extern.slf4j.Slf4j;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Slf4j
public class WorkspaceController {

    public static void register(List<WebApp.Route> routes) {
        routes.add(new WebApp.Route("GET", "/api/workspaces", WorkspaceController::getAll));
        routes.add(new WebApp.Route("GET", "/api/workspaces/current", WorkspaceController::getCurrent));
        routes.add(new WebApp.Route("POST", "/api/workspaces", WorkspaceController::create));
        routes.add(new WebApp.Route("PUT", "/api/workspaces/{id}/switch", WorkspaceController::switchWorkspace));
        routes.add(new WebApp.Route("PUT", "/api/workspaces/{id}/rename", WorkspaceController::rename));
        routes.add(new WebApp.Route("DELETE", "/api/workspaces/{id}", WorkspaceController::delete));
    }

    static void getAll(HttpExchange exchange, Map<String, String> pathParams) throws Exception {
        try {
            List<Workspace> workspaces = WorkspaceService.getInstance().getAllWorkspaces();
            Map<String, Object> result = new LinkedHashMap<>();
            result.put("success", true);
            result.put("data", workspaces);
            WebApp.sendJson(exchange, 200, result);
        } catch (Exception e) {
            log.error("获取工作区列表失败", e);
            WebApp.sendJson(exchange, 500, Map.of("success", false, "message", e.getMessage()));
        }
    }

    static void getCurrent(HttpExchange exchange, Map<String, String> pathParams) throws Exception {
        try {
            Workspace current = WorkspaceService.getInstance().getCurrentWorkspace();
            Map<String, Object> result = new LinkedHashMap<>();
            result.put("success", true);
            result.put("data", current);
            WebApp.sendJson(exchange, 200, result);
        } catch (Exception e) {
            log.error("获取当前工作区失败", e);
            WebApp.sendJson(exchange, 500, Map.of("success", false, "message", e.getMessage()));
        }
    }

    static void create(HttpExchange exchange, Map<String, String> pathParams) throws Exception {
        try {
            Workspace workspace = WebApp.parseBody(exchange, Workspace.class);
            WorkspaceService.getInstance().createWorkspace(workspace);
            Map<String, Object> result = new LinkedHashMap<>();
            result.put("success", true);
            result.put("data", workspace);
            WebApp.sendJson(exchange, 200, result);
        } catch (Exception e) {
            log.error("创建工作区失败", e);
            WebApp.sendJson(exchange, 500, Map.of("success", false, "message", e.getMessage()));
        }
    }

    static void switchWorkspace(HttpExchange exchange, Map<String, String> pathParams) throws Exception {
        try {
            String id = pathParams.get("id");
            WorkspaceService.getInstance().switchWorkspace(id);

            // 切换后让其他服务跟随新工作区刷新数据
            Workspace current = WorkspaceService.getInstance().getCurrentWorkspace();
            // 1) 重新加载当前工作区的环境变量
            EnvironmentService.setDataFilePath(ConfigPathConstants.getEnvironmentsPath(current));
            // 2) 清空集合控制器缓存，下次访问会按新工作区路径加载
            CollectionController.clearCache();

            WebApp.sendJson(exchange, 200, Map.of("success", true));
        } catch (Exception e) {
            log.error("切换工作区失败", e);
            WebApp.sendJson(exchange, 500, Map.of("success", false, "message", e.getMessage()));
        }
    }

    static void rename(HttpExchange exchange, Map<String, String> pathParams) throws Exception {
        try {
            String id = pathParams.get("id");
            Map<String, String> body = WebApp.parseBody(exchange, Map.class);
            String newName = body.get("name");
            WorkspaceService.getInstance().renameWorkspace(id, newName);
            WebApp.sendJson(exchange, 200, Map.of("success", true));
        } catch (Exception e) {
            log.error("重命名工作区失败", e);
            WebApp.sendJson(exchange, 500, Map.of("success", false, "message", e.getMessage()));
        }
    }

    static void delete(HttpExchange exchange, Map<String, String> pathParams) throws Exception {
        try {
            String id = pathParams.get("id");
            WorkspaceService.getInstance().deleteWorkspace(id);
            WebApp.sendJson(exchange, 200, Map.of("success", true));
        } catch (Exception e) {
            log.error("删除工作区失败", e);
            WebApp.sendJson(exchange, 500, Map.of("success", false, "message", e.getMessage()));
        }
    }
}