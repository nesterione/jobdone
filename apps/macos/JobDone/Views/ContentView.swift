import SwiftUI

struct ContentView: View {
    @Environment(TaskStore.self) private var store
    @State private var showCreateSheet = false
    @State private var showProjectPicker = false

    var body: some View {
        Group {
            if store.projectPath.isEmpty {
                VStack(spacing: 16) {
                    Image(systemName: "folder.badge.questionmark")
                        .font(.system(size: 48))
                        .foregroundStyle(.secondary)
                    Text("Select a project directory")
                        .font(.title2)
                    Text("Choose a folder that contains a .jobdone/ directory")
                        .foregroundStyle(.secondary)
                    Button("Open Project") {
                        pickProject()
                    }
                    .controlSize(.large)
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else if store.isLoading && store.tasks.isEmpty {
                ProgressView("Loading tasks...")
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else {
                KanbanBoard()
            }
        }
        .overlay(alignment: .bottom) {
            if let error = store.errorMessage {
                HStack {
                    Image(systemName: "exclamationmark.triangle")
                    Text(error)
                        .lineLimit(2)
                    Spacer()
                    Button("Dismiss") {
                        store.errorMessage = nil
                    }
                    .buttonStyle(.plain)
                }
                .padding(10)
                .background(.red.opacity(0.1))
                .clipShape(RoundedRectangle(cornerRadius: 8))
                .padding()
            }
        }
        .toolbar {
            ToolbarItem(placement: .primaryAction) {
                Button {
                    showCreateSheet = true
                } label: {
                    Label("New Task", systemImage: "plus")
                }
                .disabled(store.projectPath.isEmpty)
            }

            ToolbarItem(placement: .primaryAction) {
                Button {
                    Task { await store.refresh() }
                } label: {
                    Label("Refresh", systemImage: "arrow.clockwise")
                }
                .disabled(store.projectPath.isEmpty)
            }

            ToolbarItem(placement: .automatic) {
                Button {
                    pickProject()
                } label: {
                    Label("Open Project", systemImage: "folder")
                }
            }

            ToolbarItem(placement: .automatic) {
                if !store.projectPath.isEmpty {
                    Text(store.projectPath.components(separatedBy: "/").last ?? store.projectPath)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
            }
        }
        .sheet(isPresented: $showCreateSheet) {
            CreateTaskSheet()
        }
    }

    private func pickProject() {
        let panel = NSOpenPanel()
        panel.canChooseDirectories = true
        panel.canChooseFiles = false
        panel.allowsMultipleSelection = false
        panel.message = "Select a project folder with .jobdone/ directory"

        if panel.runModal() == .OK, let url = panel.url {
            store.projectPath = url.path
        }
    }
}
