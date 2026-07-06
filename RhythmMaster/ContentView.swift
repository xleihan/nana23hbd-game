import SwiftUI
import WebKit

struct ContentView: View {
    @State private var serverPort: UInt16 = 0
    @State private var errorMessage: String? = nil
    
    var body: some View {
        Group {
            if let error = errorMessage {
                VStack(spacing: 16) {
                    Text("啟動本地伺服器失敗")
                        .font(.title)
                        .foregroundColor(.red)
                    Text(error)
                        .font(.body)
                        .multilineTextAlignment(.center)
                        .padding()
                }
                .frame(width: 800, height: 600)
            } else if serverPort > 0 {
                WebView(url: URL(string: "http://localhost:\(serverPort)")!)
                    .frame(minWidth: 1024, minHeight: 768)
            } else {
                VStack(spacing: 20) {
                    ProgressView()
                    Text("正在載入節奏高手本機遊戲資源...")
                        .font(.headline)
                }
                .frame(width: 800, height: 600)
            }
        }
        .onAppear {
            startServer()
        }
    }
    
    func startServer() {
        guard let resourcePath = Bundle.main.resourcePath else {
            errorMessage = "無法取得應用程式資源路徑。"
            return
        }
        let webRoot = URL(fileURLWithPath: resourcePath).appendingPathComponent("dist")
        
        // 檢查資源目錄是否存在
        if !FileManager.default.fileExists(atPath: webRoot.path) {
            errorMessage = "找不到內嵌的遊戲網頁資源 (dist)。\n預計路徑: \(webRoot.path)"
            return
        }
        
        // 嘗試尋找可用連接埠
        var port: UInt16 = 18080
        var server: LocalServer? = nil
        
        for p in 18080...18100 {
            do {
                server = try LocalServer(webRoot: webRoot, port: UInt16(p))
                port = UInt16(p)
                break
            } catch {
                print("連接埠 \(p) 被佔用，嘗試下一個...")
                continue
            }
        }
        
        if let activeServer = server {
            activeServer.start()
            ServerManager.shared.activeServer = activeServer
            self.serverPort = port
        } else {
            errorMessage = "無法在連接埠 18080-18100 啟動本地伺服器。"
        }
    }
}

class ServerManager {
    static let shared = ServerManager()
    var activeServer: LocalServer?
}

struct WebView: NSViewRepresentable {
    let url: URL
    
    func makeNSView(context: Context) -> WKWebView {
        let config = WKWebViewConfiguration()
        // 允許媒體自動播放且不需要使用者互動
        config.mediaTypesRequiringUserActionForPlayback = []
        
        let webView = WKWebView(frame: .zero, configuration: config)
        
        // 允許網頁內部開發者工具
        #if DEBUG
        webView.configuration.preferences.setValue(true, forKey: "developerExtrasEnabled")
        #endif
        
        return webView
    }
    
    func updateNSView(_ nsView: WKWebView, context: Context) {
        let request = URLRequest(url: url)
        nsView.load(request)
    }
}
