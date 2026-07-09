package com.laker.postman.web.api;

import cn.hutool.json.JSONObject;
import cn.hutool.json.JSONUtil;
import com.laker.postman.collection.model.CollectionDocument;
import com.laker.postman.collection.model.CollectionNode;
import com.laker.postman.collection.model.RequestGroup;
import com.laker.postman.common.constants.ConfigPathConstants;
import com.laker.postman.model.Workspace;
import com.laker.postman.request.model.HttpRequestItem;
import com.laker.postman.service.WorkspaceService;
import com.laker.postman.service.collections.CollectionFilePersistence;
import com.laker.postman.web.WebApp;
import com.sun.net.httpserver.HttpExchange;
import lombok.extern.slf4j.Slf4j;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

@Slf4j
public class CollectionController {

    private static final Map<String, CollectionFilePersistence> persistenceCache = new ConcurrentHashMap<>();

    public static void register(List<WebApp.Route> routes) {
        routes.add(new WebApp.Route("GET", "/api/collections", CollectionController::getCollectionTree));
        routes.add(new WebApp.Route("POST", "/api/collections/groups", CollectionController::createGroup));
        routes.add(new WebApp.Route("PUT", "/api/collections/groups/{id}", CollectionController::updateGroup));
        routes.add(new WebApp.Route("POST", "/api/collections/requests", CollectionController::createRequest));
        routes.add(new WebApp.Route("PUT", "/api/collections/requests/{id}", CollectionController::updateRequest));
        routes.add(new WebApp.Route("DELETE", "/api/collections/{id}", CollectionController::deleteNode));
        routes.add(new WebApp.Route("PUT", "/api/collections/{id}/move", CollectionController::moveNode));
    }

    /**
     * 切换工作区后清空缓存，让下次访问时按新工作区重建持久化实例。
     */
    public static void clearCache() {
        persistenceCache.clear();
    }

    private static CollectionFilePersistence getPersistence() {
        Workspace ws = WorkspaceService.getInstance().getCurrentWorkspace();
        String cacheKey = ws == null ? "__default__" : ws.getId();
        String path = ConfigPathConstants.getCollectionsPath(ws);
        return persistenceCache.computeIfAbsent(cacheKey, k -> new CollectionFilePersistence(path));
    }

    private static CollectionDocument loadDocument() {
        try {
            return getPersistence().loadOrCreate(CollectionDocument::empty);
        } catch (Exception e) {
            log.error("加载集合失败", e);
            return CollectionDocument.empty();
        }
    }

    private static void saveDocument(CollectionDocument doc) {
        getPersistence().save(doc);
    }

    static void getCollectionTree(HttpExchange exchange, Map<String, String> pathParams) throws Exception {
        CollectionDocument doc = loadDocument();
        List<Map<String, Object>> tree = new ArrayList<>();
        for (CollectionNode node : doc.getRoots()) {
            tree.add(serializeNode(node));
        }
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("success", true);
        result.put("data", tree);
        WebApp.sendJson(exchange, 200, result);
    }

    private static Map<String, Object> serializeNode(CollectionNode node) {
        Map<String, Object> map = new LinkedHashMap<>();
        if (node.isGroup()) {
            RequestGroup group = node.asGroup();
            map.put("id", group.getId());
            map.put("type", "group");
            map.put("name", group.getName());
            map.put("description", group.getDescription());
            map.put("authType", group.getAuthType());
            map.put("prescript", group.getPrescript());
            map.put("postscript", group.getPostscript());
            map.put("headers", group.getHeaders());
            map.put("variables", group.getVariables());
            List<Map<String, Object>> children = new ArrayList<>();
            for (CollectionNode child : node.getChildren()) {
                children.add(serializeNode(child));
            }
            map.put("children", children);
        } else {
            HttpRequestItem req = node.asRequest();
            map.put("id", req.getId());
            map.put("type", "request");
            map.put("name", req.getName());
            map.put("method", req.getMethod());
            map.put("url", req.getUrl());
            map.put("request", req);
            map.put("children", Collections.emptyList());
        }
        return map;
    }

    static void createGroup(HttpExchange exchange, Map<String, String> pathParams) throws Exception {
        try {
            JSONObject body = JSONUtil.parseObj(WebApp.readBody(exchange));
            CollectionDocument doc = loadDocument();
            RequestGroup group = new RequestGroup(body.getStr("name", "新建分组"));
            group.setDescription(body.getStr("description", ""));
            CollectionNode groupNode = CollectionNode.group(group);

            List<CollectionNode> roots = doc.mutableRootsCopy();
            String parentId = body.getStr("parentId");
            if (parentId == null || parentId.isBlank()) {
                roots.add(groupNode);
            } else {
                CollectionNode parent = findGroupById(roots, parentId);
                if (parent != null) {
                    parent.addChild(groupNode);
                } else {
                    roots.add(groupNode);
                }
            }

            saveDocument(new CollectionDocument(roots));
            Map<String, Object> result = new LinkedHashMap<>();
            result.put("success", true);
            result.put("data", serializeNode(groupNode));
            WebApp.sendJson(exchange, 200, result);
        } catch (Exception e) {
            log.error("创建分组失败", e);
            WebApp.sendJson(exchange, 500, Map.of("success", false, "message", e.getMessage()));
        }
    }

    static void updateGroup(HttpExchange exchange, Map<String, String> pathParams) throws Exception {
        try {
            String id = pathParams.get("id");
            RequestGroup update = WebApp.parseBody(exchange, RequestGroup.class);
            CollectionDocument doc = loadDocument();
            List<CollectionNode> roots = doc.mutableRootsCopy();
            boolean updated = updateGroupInTree(roots, id, update);
            if (updated) {
                saveDocument(new CollectionDocument(roots));
                WebApp.sendJson(exchange, 200, Map.of("success", true));
            } else {
                WebApp.sendJson(exchange, 404, Map.of("success", false, "message", "分组不存在"));
            }
        } catch (Exception e) {
            log.error("更新分组失败", e);
            WebApp.sendJson(exchange, 500, Map.of("success", false, "message", e.getMessage()));
        }
    }

    static void createRequest(HttpExchange exchange, Map<String, String> pathParams) throws Exception {
        try {
            JSONObject body = JSONUtil.parseObj(WebApp.readBody(exchange));
            CollectionDocument doc = loadDocument();
            HttpRequestItem item = new HttpRequestItem();
            item.setId(UUID.randomUUID().toString());
            item.setName(body.getStr("name", "新建请求"));
            item.setMethod(body.getStr("method", "GET"));
            item.setUrl(body.getStr("url", ""));

            CollectionNode reqNode = CollectionNode.request(item);
            List<CollectionNode> roots = doc.mutableRootsCopy();
            String parentId = body.getStr("parentId");
            if (parentId == null || parentId.isBlank()) {
                roots.add(reqNode);
            } else {
                CollectionNode parent = findGroupById(roots, parentId);
                if (parent != null) {
                    parent.addChild(reqNode);
                } else {
                    roots.add(reqNode);
                }
            }

            saveDocument(new CollectionDocument(roots));
            Map<String, Object> result = new LinkedHashMap<>();
            result.put("success", true);
            result.put("data", item);
            WebApp.sendJson(exchange, 200, result);
        } catch (Exception e) {
            log.error("创建请求失败", e);
            WebApp.sendJson(exchange, 500, Map.of("success", false, "message", e.getMessage()));
        }
    }

    static void updateRequest(HttpExchange exchange, Map<String, String> pathParams) throws Exception {
        try {
            String id = pathParams.get("id");
            HttpRequestItem update = WebApp.parseBody(exchange, HttpRequestItem.class);
            CollectionDocument doc = loadDocument();
            List<CollectionNode> roots = doc.mutableRootsCopy();
            boolean updated = updateRequestInTree(roots, id, update);
            if (updated) {
                saveDocument(new CollectionDocument(roots));
                WebApp.sendJson(exchange, 200, Map.of("success", true));
            } else {
                WebApp.sendJson(exchange, 404, Map.of("success", false, "message", "请求不存在"));
            }
        } catch (Exception e) {
            log.error("更新请求失败", e);
            WebApp.sendJson(exchange, 500, Map.of("success", false, "message", e.getMessage()));
        }
    }

    static void deleteNode(HttpExchange exchange, Map<String, String> pathParams) throws Exception {
        try {
            String id = pathParams.get("id");
            CollectionDocument doc = loadDocument();
            List<CollectionNode> roots = doc.mutableRootsCopy();
            boolean deleted = deleteNodeFromTree(roots, id);
            if (deleted) {
                saveDocument(new CollectionDocument(roots));
                WebApp.sendJson(exchange, 200, Map.of("success", true));
            } else {
                WebApp.sendJson(exchange, 404, Map.of("success", false, "message", "节点不存在"));
            }
        } catch (Exception e) {
            log.error("删除节点失败", e);
            WebApp.sendJson(exchange, 500, Map.of("success", false, "message", e.getMessage()));
        }
    }

    private static CollectionNode findGroupById(List<CollectionNode> nodes, String id) {
        for (CollectionNode node : nodes) {
            if (node.isGroup() && node.asGroup().getId().equals(id)) {
                return node;
            }
            if (node.isGroup()) {
                CollectionNode found = findGroupById(node.getChildren(), id);
                if (found != null) return found;
            }
        }
        return null;
    }

    private static boolean updateGroupInTree(List<CollectionNode> nodes, String id, RequestGroup update) {
        for (CollectionNode node : nodes) {
            if (node.isGroup() && node.asGroup().getId().equals(id)) {
                RequestGroup g = node.asGroup();
                if (update.getName() != null) g.setName(update.getName());
                if (update.getDescription() != null) g.setDescription(update.getDescription());
                if (update.getAuthType() != null) g.setAuthType(update.getAuthType());
                if (update.getPrescript() != null) g.setPrescript(update.getPrescript());
                if (update.getPostscript() != null) g.setPostscript(update.getPostscript());
                if (update.getHeaders() != null) g.setHeaders(update.getHeaders());
                if (update.getVariables() != null) g.setVariables(update.getVariables());
                return true;
            }
            if (node.isGroup() && updateGroupInTree(node.getChildren(), id, update)) {
                return true;
            }
        }
        return false;
    }

    private static boolean updateRequestInTree(List<CollectionNode> nodes, String id, HttpRequestItem update) {
        for (CollectionNode node : nodes) {
            if (node.isRequest() && node.asRequest().getId().equals(id)) {
                HttpRequestItem req = node.asRequest();
                // 更新所有字段，确保 OpenAPI 导入的完整数据都能保存
                if (update.getName() != null) req.setName(update.getName());
                if (update.getDescription() != null) req.setDescription(update.getDescription());
                if (update.getMethod() != null) req.setMethod(update.getMethod());
                if (update.getUrl() != null) req.setUrl(update.getUrl());
                if (update.getProtocol() != null) req.setProtocol(update.getProtocol());
                if (update.getHttpVersion() != null) req.setHttpVersion(update.getHttpVersion());
                if (update.getHeadersList() != null) req.setHeadersList(update.getHeadersList());
                if (update.getParamsList() != null) req.setParamsList(update.getParamsList());
                if (update.getPathVariablesList() != null) req.setPathVariablesList(update.getPathVariablesList());
                if (update.getBodyType() != null) req.setBodyType(update.getBodyType());
                if (update.getBody() != null) req.setBody(update.getBody());
                if (update.getFormDataList() != null) req.setFormDataList(update.getFormDataList());
                if (update.getUrlencodedList() != null) req.setUrlencodedList(update.getUrlencodedList());
                if (update.getAuthType() != null) req.setAuthType(update.getAuthType());
                if (update.getAuthUsername() != null) req.setAuthUsername(update.getAuthUsername());
                if (update.getAuthPassword() != null) req.setAuthPassword(update.getAuthPassword());
                if (update.getAuthToken() != null) req.setAuthToken(update.getAuthToken());
                if (update.getAuthApiKeyName() != null) req.setAuthApiKeyName(update.getAuthApiKeyName());
                if (update.getAuthApiKeyValue() != null) req.setAuthApiKeyValue(update.getAuthApiKeyValue());
                if (update.getAuthApiKeyPlacement() != null) req.setAuthApiKeyPlacement(update.getAuthApiKeyPlacement());
                if (update.getProxyPolicy() != null) req.setProxyPolicy(update.getProxyPolicy());
                if (update.getPrescript() != null) req.setPrescript(update.getPrescript());
                if (update.getPostscript() != null) req.setPostscript(update.getPostscript());
                if (update.getResponse() != null) req.setResponse(update.getResponse());
                return true;
            }
            if (node.isGroup() && updateRequestInTree(node.getChildren(), id, update)) {
                return true;
            }
        }
        return false;
    }

    private static boolean deleteNodeFromTree(List<CollectionNode> nodes, String id) {
        Iterator<CollectionNode> it = nodes.iterator();
        while (it.hasNext()) {
            CollectionNode node = it.next();
            String nodeId = node.isGroup() ? node.asGroup().getId() : node.asRequest().getId();
            if (nodeId.equals(id)) {
                it.remove();
                return true;
            }
            if (node.isGroup() && deleteNodeFromTree(node.getChildren(), id)) {
                return true;
            }
        }
        return false;
    }

    static void moveNode(HttpExchange exchange, Map<String, String> pathParams) throws Exception {
        try {
            String id = pathParams.get("id");
            JSONObject body = JSONUtil.parseObj(WebApp.readBody(exchange));
            String targetParentId = body.getStr("targetParentId");
            int targetIndex = body.getInt("targetIndex", 0);

            CollectionDocument doc = loadDocument();
            List<CollectionNode> roots = doc.mutableRootsCopy();

            // 1. Find and remove the node from its current position
            CollectionNode[] nodeHolder = new CollectionNode[1];
            removeNodeById(roots, id, nodeHolder);
            if (nodeHolder[0] == null) {
                WebApp.sendJson(exchange, 404, Map.of("success", false, "message", "节点不存在"));
                return;
            }

            CollectionNode nodeToMove = nodeHolder[0];

            // 2. Check for circular reference: cannot move a node into its own descendant
            if (targetParentId != null && !targetParentId.isBlank() && isDescendantOf(nodeToMove, targetParentId)) {
                WebApp.sendJson(exchange, 400, Map.of("success", false, "message", "不能将节点移动到自身的子节点中"));
                return;
            }

            // 3. Insert into target position
            if (targetParentId == null || targetParentId.isBlank()) {
                // Move to root level
                if (targetIndex < 0) targetIndex = 0;
                if (targetIndex > roots.size()) targetIndex = roots.size();
                roots.add(targetIndex, nodeToMove);
            } else {
                // Move to a group
                CollectionNode targetParent = findGroupById(roots, targetParentId);
                if (targetParent == null) {
                    WebApp.sendJson(exchange, 404, Map.of("success", false, "message", "目标分组不存在"));
                    return;
                }
                List<CollectionNode> children = targetParent.getChildren();
                if (targetIndex < 0) targetIndex = 0;
                if (targetIndex > children.size()) targetIndex = children.size();
                children.add(targetIndex, nodeToMove);
            }

            saveDocument(new CollectionDocument(roots));
            WebApp.sendJson(exchange, 200, Map.of("success", true));
        } catch (Exception e) {
            log.error("移动节点失败", e);
            WebApp.sendJson(exchange, 500, Map.of("success", false, "message", e.getMessage()));
        }
    }

    private static void removeNodeById(List<CollectionNode> nodes, String id, CollectionNode[] holder) {
        Iterator<CollectionNode> it = nodes.iterator();
        while (it.hasNext()) {
            CollectionNode node = it.next();
            String nodeId = node.isGroup() ? node.asGroup().getId() : node.asRequest().getId();
            if (nodeId.equals(id)) {
                holder[0] = node;
                it.remove();
                return;
            }
            if (node.isGroup()) {
                removeNodeById(node.getChildren(), id, holder);
                if (holder[0] != null) return;
            }
        }
    }

    private static boolean isDescendantOf(CollectionNode node, String targetId) {
        if (!node.isGroup()) {
            return false;
        }
        for (CollectionNode child : node.getChildren()) {
            String childId = child.isGroup() ? child.asGroup().getId() : child.asRequest().getId();
            if (childId.equals(targetId)) {
                return true;
            }
            if (isDescendantOf(child, targetId)) {
                return true;
            }
        }
        return false;
    }
}
