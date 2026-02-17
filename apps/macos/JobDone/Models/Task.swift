import Foundation

struct TaskItem: Identifiable, Codable, Hashable {
    let filename: String
    let status: String
    let title: String
    let priority: String
    let created: String
    let body: String

    var id: String { filename }

    var priorityColor: String {
        switch priority {
        case "high": return "red"
        case "low": return "gray"
        default: return "orange"
        }
    }
}

struct GroupedTasks: Codable {
    let statuses: [String]
    let tasks: [String: [TaskItem]]
}
