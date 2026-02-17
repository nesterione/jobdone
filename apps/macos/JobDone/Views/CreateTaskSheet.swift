import SwiftUI

struct CreateTaskSheet: View {
    @Environment(TaskStore.self) private var store
    @Environment(\.dismiss) private var dismiss
    @State private var title = ""
    @State private var priority = "medium"

    let priorities = ["low", "medium", "high"]

    var body: some View {
        VStack(spacing: 16) {
            Text("New Task")
                .font(.headline)

            TextField("Task title", text: $title)
                .textFieldStyle(.roundedBorder)

            Picker("Priority", selection: $priority) {
                ForEach(priorities, id: \.self) { p in
                    Text(p.capitalized).tag(p)
                }
            }
            .pickerStyle(.segmented)

            HStack {
                Button("Cancel") {
                    dismiss()
                }
                .keyboardShortcut(.cancelAction)

                Spacer()

                Button("Create") {
                    guard !title.trimmingCharacters(in: .whitespaces).isEmpty else { return }
                    Task {
                        await store.createTask(title: title, priority: priority)
                        dismiss()
                    }
                }
                .keyboardShortcut(.defaultAction)
                .disabled(title.trimmingCharacters(in: .whitespaces).isEmpty)
            }
        }
        .padding(20)
        .frame(width: 350)
    }
}
