import Foundation

enum CLIError: LocalizedError {
    case notFound(String)
    case executionFailed(String)
    case parseError(String)

    var errorDescription: String? {
        switch self {
        case .notFound(let path):
            return "jobdone CLI not found at: \(path)"
        case .executionFailed(let message):
            return "CLI command failed: \(message)"
        case .parseError(let message):
            return "Failed to parse CLI output: \(message)"
        }
    }
}

actor CLIBridge {
    var cliBinaryPath: String
    var projectPath: String

    init(cliBinaryPath: String = "jobdone", projectPath: String = "") {
        self.cliBinaryPath = cliBinaryPath
        self.projectPath = projectPath
    }

    func setProjectPath(_ path: String) {
        projectPath = path
    }

    func setCliBinaryPath(_ path: String) {
        cliBinaryPath = path
    }

    // MARK: - List Tasks

    func listTasks() async throws -> GroupedTasks {
        let output = try runCommand(arguments: ["list", "--json"])
        guard let data = output.data(using: .utf8) else {
            throw CLIError.parseError("Invalid UTF-8 output")
        }
        do {
            return try JSONDecoder().decode(GroupedTasks.self, from: data)
        } catch {
            throw CLIError.parseError(error.localizedDescription)
        }
    }

    // MARK: - Create Task

    func createTask(title: String, priority: String? = nil) async throws {
        var args = ["create", title]
        if let priority = priority {
            args.append(contentsOf: ["-p", priority])
        }
        _ = try runCommand(arguments: args)
    }

    // MARK: - Move Task

    func moveTask(filename: String, to status: String) async throws {
        _ = try runCommand(arguments: ["move", filename, status])
    }

    // MARK: - Private

    private func resolveShellPath() -> String {
        // GUI apps get a minimal PATH; grab the user's full PATH from their login shell
        let shell = ProcessInfo.processInfo.environment["SHELL"] ?? "/bin/zsh"
        let proc = Process()
        let pipe = Pipe()
        proc.executableURL = URL(fileURLWithPath: shell)
        proc.arguments = ["-l", "-c", "echo $PATH"]
        proc.standardOutput = pipe
        proc.standardError = FileHandle.nullDevice
        do {
            try proc.run()
            proc.waitUntilExit()
            let data = pipe.fileHandleForReading.readDataToEndOfFile()
            if let path = String(data: data, encoding: .utf8)?.trimmingCharacters(in: .whitespacesAndNewlines), !path.isEmpty {
                return path
            }
        } catch {}
        return "/usr/local/bin:/opt/homebrew/bin:/usr/bin:/bin"
    }

    private func runCommand(arguments: [String]) throws -> String {
        let process = Process()
        let stdoutPipe = Pipe()
        let stderrPipe = Pipe()

        process.executableURL = URL(fileURLWithPath: "/usr/bin/env")
        process.arguments = [cliBinaryPath] + arguments
        process.standardOutput = stdoutPipe
        process.standardError = stderrPipe

        // Inherit the user's full PATH so `jobdone` can be found
        var env = ProcessInfo.processInfo.environment
        env["PATH"] = resolveShellPath()
        process.environment = env

        if !projectPath.isEmpty {
            process.currentDirectoryURL = URL(fileURLWithPath: projectPath)
        }

        print("[CLIBridge] Running: \(cliBinaryPath) \(arguments.joined(separator: " "))")
        if !projectPath.isEmpty {
            print("[CLIBridge] CWD: \(projectPath)")
        }

        try process.run()
        process.waitUntilExit()

        let stdoutData = stdoutPipe.fileHandleForReading.readDataToEndOfFile()
        let stderrData = stderrPipe.fileHandleForReading.readDataToEndOfFile()
        let stdout = String(data: stdoutData, encoding: .utf8) ?? ""
        let stderr = String(data: stderrData, encoding: .utf8) ?? ""

        print("[CLIBridge] Exit code: \(process.terminationStatus)")
        if !stderr.isEmpty {
            print("[CLIBridge] Stderr: \(stderr)")
        }

        if process.terminationStatus != 0 {
            let message = stderr.isEmpty ? stdout : stderr
            throw CLIError.executionFailed(message.trimmingCharacters(in: .whitespacesAndNewlines))
        }

        return stdout
    }
}
