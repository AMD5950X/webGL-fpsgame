#include "game-server-CMake.h"

#include <cstdint>          // 提供固定宽度的整数类型（如 int64_t）
#include <iostream>         // 用于 std::cout 等输入输出
#include <string>           // std::string
#include <string_view>      // std::string_view（零拷贝的字符串视图）
#include <unordered_map>    // 哈希表容器 std::unordered_map
#include <memory>           // 智能指针等（这里预留）
#include <ctime>            // std::time
#include <chrono>           // 高精度时间（未使用，但常见）

// spdlog：一个常用的日志库，用于打印日志（info/debug/error）
#include <spdlog/spdlog.h>
#include <spdlog/sinks/basic_file_sink.h>
#include <spdlog/sinks/stdout_color_sinks.h>

// uWebSockets：高性能的 WebSocket 库，包含 App（服务器应用）
#include <uwebsockets/App.h>

// 每个 WebSocket 连接对应的用户数据结构
// 这个结构会为每个连接分配一个实例，放在连接对象里
struct PerSocketData {
    int64_t id = 0;           // 为每个连接分配的唯一 ID（整型）
    std::string username;     // 存储用户名称（这里用自动生成的名字）
    bool authenticated = false; // 是否已通过身份验证（示例中始终 true）
};

// 全局数据：维护所有已连接用户的映射（ID -> 用户名）
// 注意：真实项目中全局可变状态要考虑线程安全（锁）
static std::unordered_map<int64_t, std::string> connected_users;
static int64_t next_user_id = 1; // 下一个要分配的用户 ID

int main() {
    // 允许简短引用 uWS 命名空间里的类型
    using namespace uWS;

    // 初始化并记录服务器启动信息
    spdlog::info("Starting WebSocket game server on port 9001");

    // 创建一个 uWebSockets 应用并注册一个 WebSocket 路由（"/*" 匹配所有路径）
    // ws<PerSocketData> 模板参数表示每个连接会绑定一个 PerSocketData 实例
    uWS::App().ws<PerSocketData>("/*", {
        // open：当有新客户端连接时被调用
        // 参数是一个指向连接对象的指针，连接对象携带用户数据（PerSocketData）
        .open = [](auto* ws) {
            // 从连接对象获取与之关联的用户数据
            auto* userData = ws->getUserData();

            // 给该连接分配一个唯一 ID，并生成一个默认用户名
            userData->id = next_user_id++;
            userData->username = "User_" + std::to_string(userData->id);
            userData->authenticated = true; // 示例中标记为已认证

            // 把这个用户加入到全局的 connected_users 映射
            connected_users[userData->id] = userData->username;

            // 使用 spdlog 打印一条信息日志
            spdlog::info("Client connected: {} (ID: {})", userData->username, userData->id);

            // 发送一个欢迎消息给新连接的客户端（JSON 字符串示例）
            // ws->send 可以发送文本或二进制消息，这里使用 TEXT（字符串）
            std::string welcome_msg = "{\"type\":\"system\",\"message\":\"Welcome " + userData->username + "!\"}";
            ws->send(welcome_msg, uWS::OpCode::TEXT);

            // 向名为 "game_room" 的频道发布一条用户加入的通知（pub/sub 模式）
            // 其他订阅了该频道的客户端会收到该消息
            std::string join_msg = "{\"type\":\"user_join\",\"username\":\"" + userData->username + "\"}";
            ws->publish("game_room", join_msg, uWS::OpCode::TEXT);

            // 订阅自己到该频道，这样后续 publish 的消息也会发送给自己
            ws->subscribe("game_room");
        },

        // message：当连接收到消息时被调用
        // message 的参数 message 是 std::string_view（不额外拷贝）
        .message = [](auto* ws, std::string_view message, uWS::OpCode opCode) {
            auto* userData = ws->getUserData();

            // 将 string_view 转成 std::string（如果需要持久化或修改）
            std::string msg_str(message);

            // 示例：检测是否为 ping 类型的消息（简单字符串匹配）
            // 这里假设 ping 消息的格式是 {"type":"ping",...}
            if (msg_str.find("{\"type\":\"ping\"") == 0) {
                // 收到 ping，直接用相同的数据回复 pong（仅把类型替换为 pong）
                std::string pong_msg = msg_str;
                size_t type_pos = pong_msg.find("\"ping\"");
                if (type_pos != std::string::npos) {
                    // 把 "ping" 替换成 "pong"，长度相同，替换安全
                    pong_msg.replace(type_pos, 6, "\"pong\"");
                }
                // 发送 pong 回应
                ws->send(pong_msg, uWS::OpCode::TEXT);
                return; // 处理完毕，返回
            }

            // 记录收到的消息（可在开发时用于调试）
            spdlog::info("Received message from {}: {}", userData->username, msg_str);

            // 构造一个广播消息（JSON 字符串），包含用户名、消息和时间戳
            // 注意：这里没有做 JSON 转义或验证，真实项目中要使用 JSON 库（如 nlohmann::json）
            std::string broadcast_msg = "{\"type\":\"chat\",\"username\":\"" + userData->username + "\",\"message\":\"" + msg_str + "\",\"timestamp\":" + std::to_string(std::time(nullptr)) + "}";

            // publish：把消息发送到订阅了 "game_room" 的所有客户端（包括自己）
            ws->publish("game_room", broadcast_msg, uWS::OpCode::TEXT);
        },

        // drain：当内置发送缓冲区从满恢复时触发
        // 可在此处继续从你的发送队列发送数据
        .drain = [](auto* ws) {
            spdlog::debug("Socket drain event");
        },

        // close：当连接关闭时被调用
        .close = [](auto* ws, int /*code*/, std::string_view /*msg*/) {
            auto* userData = ws->getUserData();

            // 记录断开连接的用户
            spdlog::info("Client disconnected: {} (ID: {})", userData->username, userData->id);

            // 从全局映射中移除该用户
            connected_users.erase(userData->id);

            // 广播用户离开的通知
            std::string leave_msg = "{\"type\":\"user_leave\",\"username\":\"" + userData->username + "\"}";
            ws->publish("game_room", leave_msg, uWS::OpCode::TEXT);
        }
    })
    // 监听端口 9001，回调会告诉我们是否绑定成功
    .listen(9001, [](auto* listenSocket) {
        if (listenSocket) {
            spdlog::info("WebSocket server listening on port 9001");
            std::cout << "Game server is running on ws://localhost:9001" << std::endl;
        } else {
            spdlog::error("Failed to listen on port 9001");
        }
    })
    // run() 开始事件循环并阻塞当前线程（直到应用退出）
    .run();

    return 0;
}