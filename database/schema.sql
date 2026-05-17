-- Momentum AI MySQL schema for Railway/Render/MySQL deployments.
-- Local development uses SQLAlchemy with SQLite by default.

CREATE TABLE users (
  id VARCHAR(32) PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  email VARCHAR(160) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(32) NOT NULL CHECK (role IN ('Employee', 'Manager', 'Admin')),
  manager_id VARCHAR(32),
  department VARCHAR(80) NOT NULL,
  profile_image VARCHAR(255) DEFAULT '',
  workload INT DEFAULT 50 CHECK (workload BETWEEN 0 AND 100),
  streak INT DEFAULT 0,
  badges TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (manager_id) REFERENCES users(id)
);

CREATE TABLE shared_goals (
  shared_goal_id VARCHAR(32) PRIMARY KEY,
  title VARCHAR(180) NOT NULL,
  description TEXT NOT NULL,
  thrust_area VARCHAR(100) NOT NULL,
  uom_type VARCHAR(40) NOT NULL,
  target DOUBLE NOT NULL,
  target_label VARCHAR(80) NOT NULL,
  primary_owner VARCHAR(32) NOT NULL,
  linked_users TEXT NOT NULL,
  FOREIGN KEY (primary_owner) REFERENCES users(id)
);

CREATE TABLE goals (
  goal_id VARCHAR(32) PRIMARY KEY,
  user_id VARCHAR(32) NOT NULL,
  title VARCHAR(180) NOT NULL,
  description TEXT NOT NULL,
  thrust_area VARCHAR(100) NOT NULL,
  uom_type VARCHAR(40) NOT NULL CHECK (uom_type IN ('Numeric', 'Percentage', '%', 'Timeline', 'Zero-based')),
  direction VARCHAR(16) DEFAULT 'min' CHECK (direction IN ('min', 'max', 'timeline', 'zero')),
  target DOUBLE NOT NULL CHECK (target >= 0),
  target_label VARCHAR(80) NOT NULL,
  weightage INT NOT NULL CHECK (weightage BETWEEN 10 AND 100),
  status VARCHAR(40) DEFAULT 'Not Started' CHECK (status IN ('Not Started', 'On Track', 'Completed')),
  approval_status VARCHAR(40) DEFAULT 'Draft' CHECK (approval_status IN ('Draft', 'Submitted', 'Pending', 'Pending Approval', 'Returned', 'Approved', 'Locked', 'Unlocked')),
  locked BOOLEAN DEFAULT FALSE,
  shared_goal_id VARCHAR(32),
  primary_owner BOOLEAN DEFAULT FALSE,
  evidence_files TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (shared_goal_id) REFERENCES shared_goals(shared_goal_id)
);

CREATE TABLE shared_goal_mappings (
  id VARCHAR(32) PRIMARY KEY,
  primary_goal_id VARCHAR(32) NOT NULL,
  linked_goal_id VARCHAR(32) NOT NULL,
  owner_id VARCHAR(32) NOT NULL,
  sync_enabled BOOLEAN DEFAULT TRUE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (primary_goal_id) REFERENCES goals(goal_id),
  FOREIGN KEY (linked_goal_id) REFERENCES goals(goal_id),
  FOREIGN KEY (owner_id) REFERENCES users(id),
  UNIQUE KEY uq_shared_goal_mapping (primary_goal_id, linked_goal_id)
);

CREATE TABLE quarter_updates (
  id VARCHAR(32) PRIMARY KEY,
  goal_id VARCHAR(32) NOT NULL,
  quarter VARCHAR(8) NOT NULL CHECK (quarter IN ('Q1', 'Q2', 'Q3', 'Q4')),
  planned DOUBLE NOT NULL CHECK (planned >= 0),
  achievement DOUBLE DEFAULT 0 CHECK (achievement >= 0),
  progress DOUBLE DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),
  status VARCHAR(40) DEFAULT 'Not Started' CHECK (status IN ('Not Started', 'On Track', 'Completed')),
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (goal_id) REFERENCES goals(goal_id),
  UNIQUE KEY uq_quarter_goal (goal_id, quarter)
);

CREATE TABLE comments (
  id VARCHAR(32) PRIMARY KEY,
  manager_id VARCHAR(32) NOT NULL,
  employee_id VARCHAR(32) NOT NULL,
  goal_id VARCHAR(32) NOT NULL,
  text TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (manager_id) REFERENCES users(id),
  FOREIGN KEY (employee_id) REFERENCES users(id),
  FOREIGN KEY (goal_id) REFERENCES goals(goal_id)
);

CREATE TABLE audit_logs (
  id VARCHAR(32) PRIMARY KEY,
  changed_by VARCHAR(32) NOT NULL,
  actor_name VARCHAR(120) NOT NULL,
  field_changed VARCHAR(120) NOT NULL,
  old_value TEXT,
  new_value TEXT,
  reason TEXT,
  affected_entity VARCHAR(120),
  entity_id VARCHAR(32),
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (changed_by) REFERENCES users(id)
);

CREATE TABLE unlock_history (
  id VARCHAR(32) PRIMARY KEY,
  goal_id VARCHAR(32) NOT NULL,
  admin_id VARCHAR(32) NOT NULL,
  admin_name VARCHAR(120) NOT NULL,
  action VARCHAR(32) NOT NULL,
  reason TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (goal_id) REFERENCES goals(goal_id),
  FOREIGN KEY (admin_id) REFERENCES users(id)
);

CREATE TABLE notifications (
  id VARCHAR(32) PRIMARY KEY,
  user_id VARCHAR(32) NOT NULL,
  type VARCHAR(60) NOT NULL,
  message TEXT NOT NULL,
  `read` BOOLEAN DEFAULT FALSE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE escalation_logs (
  id VARCHAR(32) PRIMARY KEY,
  employee_id VARCHAR(32) NOT NULL,
  goal_id VARCHAR(32),
  risk_score INT NOT NULL,
  escalation_level VARCHAR(60) NOT NULL,
  reason TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (employee_id) REFERENCES users(id),
  FOREIGN KEY (goal_id) REFERENCES goals(goal_id)
);

CREATE TABLE ai_insights (
  id VARCHAR(32) PRIMARY KEY,
  employee_id VARCHAR(32) NOT NULL,
  summary TEXT NOT NULL,
  risk_prediction TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (employee_id) REFERENCES users(id)
);

CREATE TABLE cycle_configs (
  id VARCHAR(32) PRIMARY KEY,
  period VARCHAR(80) NOT NULL,
  window_opens VARCHAR(80) NOT NULL,
  action VARCHAR(180) NOT NULL,
  active BOOLEAN DEFAULT TRUE
);

CREATE OR REPLACE VIEW goal_sheet_validation AS
SELECT
  user_id,
  COUNT(*) AS goal_count,
  SUM(weightage) AS total_weightage,
  MIN(weightage) AS minimum_weightage,
  CASE
    WHEN COUNT(*) <= 8 AND SUM(weightage) = 100 AND MIN(weightage) >= 10 THEN 1
    ELSE 0
  END AS submission_ready
FROM goals
GROUP BY user_id;
