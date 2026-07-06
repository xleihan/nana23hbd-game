import Foundation
import Network

class LocalServer {
    let listener: NWListener
    let webRoot: URL
    let port: UInt16
    
    init(webRoot: URL, port: UInt16 = 18080) throws {
        self.webRoot = webRoot
        self.port = port
        self.listener = try NWListener(using: .tcp, on: NWEndpoint.Port(rawValue: port)!)
    }
    
    func start() {
        listener.stateUpdateHandler = { state in
            print("本地伺服器狀態: \(state)")
        }
        listener.newConnectionHandler = { [weak self] connection in
            self?.handleConnection(connection)
        }
        listener.start(queue: .global(qos: .background))
        print("本地伺服器已在連接埠 \(port) 啟動，根目錄為: \(webRoot.path)")
    }
    
    private func handleConnection(_ connection: NWConnection) {
        connection.start(queue: .global(qos: .background))
        readRequest(connection: connection)
    }
    
    private func readRequest(connection: NWConnection) {
        connection.receive(minimumIncompleteLength: 1, maximumLength: 8192) { [weak self] data, _, isComplete, error in
            guard let self = self, let data = data, error == nil else {
                connection.cancel()
                return
            }
            
            let requestString = String(decoding: data, as: UTF8.self)
            self.processRequest(connection: connection, request: requestString)
        }
    }
    
    private func processRequest(connection: NWConnection, request: String) {
        let lines = request.components(separatedBy: "\r\n")
        guard let firstLine = lines.first else {
            send404(connection: connection)
            return
        }
        
        let parts = firstLine.components(separatedBy: " ")
        guard parts.count >= 2, parts[0] == "GET" else {
            send404(connection: connection)
            return
        }
        
        var path = parts[1]
        if let queryIndex = path.firstIndex(of: "?") {
            path = String(path[..<queryIndex])
        }
        
        // URL 解碼，處理中文檔名
        path = path.removingPercentEncoding ?? path
        
        if path == "/" {
            path = "/index.html"
        }
        
        let fileURL = webRoot.appendingPathComponent(path)
        
        // 防止目錄穿越安全漏洞
        let canonicalWebRoot = webRoot.resolvingSymlinksInPath().path
        let canonicalFile = fileURL.resolvingSymlinksInPath().path
        guard canonicalFile.hasPrefix(canonicalWebRoot) else {
            send404(connection: connection)
            return
        }
        
        do {
            let fileData = try Data(contentsOf: fileURL)
            let mimeType = mimeTypeFor(path: path)
            sendResponse(connection: connection, data: fileData, mimeType: mimeType)
        } catch {
            // 對於 SPA，若不是靜態資源檔則回退到 index.html
            if path != "/index.html" && !path.contains(".") {
                do {
                    let indexURL = webRoot.appendingPathComponent("index.html")
                    let fileData = try Data(contentsOf: indexURL)
                    sendResponse(connection: connection, data: fileData, mimeType: "text/html")
                    return
                } catch {}
            }
            send404(connection: connection)
        }
    }
    
    private func sendResponse(connection: NWConnection, data: Data, mimeType: String) {
        var headers = "HTTP/1.1 200 OK\r\n"
        headers += "Content-Type: \(mimeType)\r\n"
        headers += "Content-Length: \(data.count)\r\n"
        headers += "Connection: close\r\n"
        headers += "Access-Control-Allow-Origin: *\r\n"
        headers += "\r\n"
        
        guard let headerData = headers.data(using: .utf8) else {
            connection.cancel()
            return
        }
        
        connection.send(content: headerData, completion: .contentProcessed({ error in
            if error != nil {
                connection.cancel()
                return
            }
            connection.send(content: data, completion: .contentProcessed({ _ in
                connection.cancel()
            }))
        }))
    }
    
    private func send404(connection: NWConnection) {
        let response = "HTTP/1.1 404 Not Found\r\nContent-Length: 0\r\nConnection: close\r\n\r\n"
        connection.send(content: response.data(using: .utf8), completion: .contentProcessed({ _ in
            connection.cancel()
        }))
    }
    
    private func mimeTypeFor(path: String) -> String {
        let ext = path.split(separator: ".").last?.lowercased() ?? ""
        switch ext {
        case "html", "htm": return "text/html"
        case "css": return "text/css"
        case "js": return "application/javascript"
        case "json": return "application/json"
        case "png": return "image/png"
        case "jpg", "jpeg": return "image/jpeg"
        case "gif": return "image/gif"
        case "svg": return "image/svg+xml"
        case "mp3": return "audio/mpeg"
        case "wav": return "audio/wav"
        case "ogg": return "audio/ogg"
        default: return "application/octet-stream"
        }
    }
}
