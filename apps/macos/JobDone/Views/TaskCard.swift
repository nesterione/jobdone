import SwiftUI

struct TaskCard: View {
    let task: TaskItem
    @State private var isExpanded = false

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack {
                Text(task.title)
                    .font(.headline)
                    .lineLimit(isExpanded ? nil : 2)
                Spacer()
            }

            HStack(spacing: 8) {
                PriorityBadge(priority: task.priority)
                if !task.created.isEmpty {
                    Text(task.created)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
                Spacer()
            }

            if isExpanded && !task.body.isEmpty {
                Divider()
                Text(task.body)
                    .font(.body)
                    .foregroundStyle(.secondary)
                    .textSelection(.enabled)
            }
        }
        .padding(10)
        .background(.background)
        .clipShape(RoundedRectangle(cornerRadius: 8))
        .shadow(color: .black.opacity(0.08), radius: 2, y: 1)
        .onTapGesture {
            withAnimation(.easeInOut(duration: 0.2)) {
                isExpanded.toggle()
            }
        }
    }
}

struct PriorityBadge: View {
    let priority: String

    var color: Color {
        switch priority {
        case "high": return .red
        case "low": return .gray
        default: return .orange
        }
    }

    var body: some View {
        Text(priority)
            .font(.caption)
            .fontWeight(.medium)
            .padding(.horizontal, 6)
            .padding(.vertical, 2)
            .background(color.opacity(0.15))
            .foregroundStyle(color)
            .clipShape(Capsule())
    }
}
