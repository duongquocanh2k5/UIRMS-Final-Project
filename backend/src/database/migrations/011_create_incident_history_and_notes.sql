-- Incident processing history and internal staff notes

CREATE TABLE incident_history (
  id SERIAL PRIMARY KEY,
  incident_id INTEGER NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
  action VARCHAR(50) NOT NULL CHECK (action IN ('assigned', 'status_changed', 'note_added')),
  old_status VARCHAR(50),
  new_status VARCHAR(50),
  old_assigned_to INTEGER REFERENCES admins(id) ON DELETE SET NULL,
  new_assigned_to INTEGER REFERENCES admins(id) ON DELETE SET NULL,
  note TEXT,
  performed_by INTEGER NOT NULL REFERENCES admins(id) ON DELETE RESTRICT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE incident_notes (
  id SERIAL PRIMARY KEY,
  incident_id INTEGER NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
  note TEXT NOT NULL,
  created_by INTEGER NOT NULL REFERENCES admins(id) ON DELETE RESTRICT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_incident_history_incident_id ON incident_history(incident_id);
CREATE INDEX idx_incident_history_created_at ON incident_history(created_at DESC);
CREATE INDEX idx_incident_notes_incident_id ON incident_notes(incident_id);
CREATE INDEX idx_incident_notes_created_at ON incident_notes(created_at DESC);

CREATE TRIGGER update_incident_notes_timestamp
BEFORE UPDATE ON incident_notes
FOR EACH ROW
EXECUTE FUNCTION update_timestamp();