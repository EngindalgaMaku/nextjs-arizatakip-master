// Cihaz Türleri enum'u
export enum DeviceType {
  COMPUTER = "computer",
  TABLET = "tablet",
  PROJECTOR = "projector",
  PRINTER = "printer",
  NETWORK = "network",
  SMARTBOARD = "smartboard",
  OTHER = "other"
}

// Cihaz Konumları enum'u
export enum DeviceLocation {
  CLASSROOM = "classroom",
  LABORATORY = "laboratory",
  LIBRARY = "library",
  OFFICE = "office",
  HALL = "hall",
  OTHER = "other"
}

// Arıza Durumları enum'u
export enum IssueStatus {
  REPORTED = "reported",
  IN_PROGRESS = "in_progress",
  WAITING_PARTS = "waiting_parts",
  RESOLVED = "resolved",
  CLOSED = "closed"
}

// Arıza Öncelikleri enum'u
export enum IssuePriority {
  LOW = "low",
  MEDIUM = "medium",
  HIGH = "high",
  CRITICAL = "critical"
} 