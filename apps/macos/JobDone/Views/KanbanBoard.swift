import SwiftUI

struct KanbanBoard: View {
    @Environment(TaskStore.self) private var store

    var body: some View {
        HStack(alignment: .top, spacing: 16) {
            ForEach(store.statuses, id: \.self) { status in
                KanbanColumn(status: status)
            }
        }
        .padding()
    }
}

struct KanbanColumn: View {
    let status: String
    @Environment(TaskStore.self) private var store
    @State private var isTargeted = false

    var tasks: [TaskItem] {
        store.tasksForStatus(status)
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Text(status.uppercased())
                    .font(.subheadline)
                    .fontWeight(.bold)
                    .foregroundStyle(.secondary)
                Text("\(tasks.count)")
                    .font(.caption)
                    .fontWeight(.medium)
                    .padding(.horizontal, 6)
                    .padding(.vertical, 2)
                    .background(.quaternary)
                    .clipShape(Capsule())
                Spacer()
            }
            .padding(.horizontal, 4)

            ScrollView {
                LazyVStack(spacing: 8) {
                    ForEach(tasks) { task in
                        TaskCard(task: task)
                            .draggable(task.filename)
                    }
                }
            }
        }
        .frame(minWidth: 220, maxWidth: .infinity)
        .padding(12)
        .background(
            RoundedRectangle(cornerRadius: 12)
                .fill(isTargeted ? Color.accentColor.opacity(0.08) : Color(.controlBackgroundColor))
        )
        .dropDestination(for: String.self) { filenames, _ in
            guard let filename = filenames.first else { return false }
            Task { await store.moveTask(filename: filename, to: status) }
            return true
        } isTargeted: { targeted in
            isTargeted = targeted
        }
    }
}
