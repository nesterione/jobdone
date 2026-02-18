import Foundation
import SwiftUI

@Observable
final class TaskStore {
    var statuses: [String] = []
    var tasks: [String: [TaskItem]] = [:]
    var isLoading = false
    var errorMessage: String?
    var projectPath: String = "" {
        didSet {
            if projectPath != oldValue {
                Task { await bridge.setProjectPath(projectPath) }
                UserDefaults.standard.set(projectPath, forKey: "lastProjectPath")
                startFileWatcher()
                Task { await refresh() }
            }
        }
    }

    private let bridge: CLIBridge
    private var fileWatcherSource: DispatchSourceFileSystemObject?
    private var watchedFD: Int32 = -1

    init(bridge: CLIBridge = CLIBridge()) {
        self.bridge = bridge
        if let saved = UserDefaults.standard.string(forKey: "lastProjectPath"), !saved.isEmpty {
            self.projectPath = saved
            Task {
                await bridge.setProjectPath(saved)
                await refresh()
            }
        }
    }

    func refresh() async {
        guard !projectPath.isEmpty else { return }
        isLoading = true
        errorMessage = nil
        do {
            let grouped = try await bridge.listTasks()
            withAnimation(.easeInOut(duration: 0.25)) {
                statuses = grouped.statuses
                tasks = grouped.tasks
            }
        } catch {
            errorMessage = error.localizedDescription
        }
        isLoading = false
    }

    func createTask(title: String, priority: String?) async {
        do {
            try await bridge.createTask(title: title, priority: priority)
            await refresh()
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    func moveTask(filename: String, to targetStatus: String) async {
        // Optimistic update: move the task in local state immediately
        var movedTask: TaskItem?
        for status in statuses {
            if let index = tasks[status]?.firstIndex(where: { $0.filename == filename }) {
                movedTask = tasks[status]?.remove(at: index)
                break
            }
        }
        if var task = movedTask {
            task = TaskItem(
                filename: task.filename,
                status: targetStatus,
                title: task.title,
                priority: task.priority,
                created: task.created,
                body: task.body
            )
            tasks[targetStatus, default: []].append(task)
        }

        // Run CLI in background, then sync with filesystem
        do {
            try await bridge.moveTask(filename: filename, to: targetStatus)
            await refresh()
        } catch {
            errorMessage = error.localizedDescription
            // Revert on failure by re-fetching
            await refresh()
        }
    }

    func tasksForStatus(_ status: String) -> [TaskItem] {
        tasks[status] ?? []
    }

    // MARK: - File Watcher

    private func startFileWatcher() {
        stopFileWatcher()

        let tasksDir = (projectPath as NSString).appendingPathComponent(".jobdone/tasks")
        let fd = open(tasksDir, O_EVTONLY)
        guard fd >= 0 else { return }
        watchedFD = fd

        let source = DispatchSource.makeFileSystemObjectSource(
            fileDescriptor: fd,
            eventMask: [.write, .rename, .delete],
            queue: .main
        )

        source.setEventHandler { [weak self] in
            guard let self else { return }
            Task { await self.refresh() }
        }

        source.setCancelHandler {
            close(fd)
        }

        source.resume()
        fileWatcherSource = source
    }

    private func stopFileWatcher() {
        fileWatcherSource?.cancel()
        fileWatcherSource = nil
    }

    deinit {
        stopFileWatcher()
    }
}
