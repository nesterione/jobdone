import SwiftUI

@main
struct JobDoneApp: App {
    @State private var store = TaskStore()

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environment(store)
                .frame(minWidth: 700, minHeight: 450)
        }
        .defaultSize(width: 900, height: 600)
    }
}
