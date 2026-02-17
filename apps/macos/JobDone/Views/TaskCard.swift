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
        .overlay(
            RoundedRectangle(cornerRadius: 8)
                .stroke(Color.primary.opacity(0.12), lineWidth: 1)
        )
        .overlay(alignment: .leading) {
            UnevenRoundedRectangle(
                topLeadingRadius: 8,
                bottomLeadingRadius: 8
            )
            .fill(PriorityBadge.color(for: task.priority))
            .frame(width: 4)
        }
        .shadow(color: .black.opacity(0.12), radius: 3, y: 2)
        .onTapGesture {
            withAnimation(.easeInOut(duration: 0.2)) {
                isExpanded.toggle()
            }
        }
    }
}

struct PriorityBadge: View {
    let priority: String

    static func color(for priority: String) -> Color {
        switch priority {
        case "high": return .red
        case "low": return .gray
        default: return .orange
        }
    }

    var body: some View {
        let c = Self.color(for: priority)
        Text(priority)
            .font(.caption)
            .fontWeight(.medium)
            .padding(.horizontal, 6)
            .padding(.vertical, 2)
            .background(c.opacity(0.15))
            .foregroundStyle(c)
            .clipShape(Capsule())
    }
}
