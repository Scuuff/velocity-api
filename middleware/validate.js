const { COLUMNS, PRIORITIES } = require('../models/Card');

/**
 * Validates a card body for POST /api/cards.
 * Returns array of error strings (empty if valid).
 */
function validateCardBody(body) {
  const errors = [];

  if (typeof body !== 'object' || body === null) {
    return ['Request body must be a JSON object'];
  }

  // Required: text
  if (typeof body.text !== 'string' || body.text.trim().length === 0) {
    errors.push('"text" is required and must be a non-empty string');
  } else if (body.text.length > 200) {
    errors.push('"text" must be 200 characters or fewer');
  }

  // Optional: column
  if (body.column !== undefined && !COLUMNS.includes(body.column)) {
    errors.push(`"column" must be one of: ${COLUMNS.join(', ')}`);
  }

  // Optional: priority
  if (body.priority !== undefined && !PRIORITIES.includes(body.priority)) {
    errors.push(`"priority" must be one of: ${PRIORITIES.join(', ')}`);
  }

  // Optional: dueDate (YYYY-MM-DD or empty)
  if (body.dueDate !== undefined) {
    if (typeof body.dueDate !== 'string') {
      errors.push('"dueDate" must be a string in YYYY-MM-DD format');
    } else if (body.dueDate && !/^\d{4}-\d{2}-\d{2}$/.test(body.dueDate)) {
      errors.push('"dueDate" must be in YYYY-MM-DD format');
    }
  }

  // Optional: subtasks
  if (body.subtasks !== undefined) {
    if (!Array.isArray(body.subtasks)) {
      errors.push('"subtasks" must be an array');
    } else {
      body.subtasks.forEach((s, i) => {
        if (typeof s !== 'object' || s === null) {
          errors.push(`subtasks[${i}] must be an object`);
        } else if (typeof s.text !== 'string' || s.text.trim().length === 0) {
          errors.push(`subtasks[${i}].text is required`);
        } else if (s.text.length > 120) {
          errors.push(`subtasks[${i}].text must be 120 characters or fewer`);
        }
      });
    }
  }

  return errors;
}

/**
 * Validates a card body for PUT /api/cards/:id (partial update).
 * Same rules as create, but every field is optional.
 * If a field is present, it must be valid.
 */
function validateCardUpdateBody(body) {
  const errors = [];

  if (typeof body !== 'object' || body === null) {
    return ['Request body must be a JSON object'];
  }

  // Reject empty body — must update at least one field
  if (Object.keys(body).length === 0) {
    return ['Request body must contain at least one field to update'];
  }

  if (body.text !== undefined) {
    if (typeof body.text !== 'string' || body.text.trim().length === 0) {
      errors.push('"text" must be a non-empty string');
    } else if (body.text.length > 200) {
      errors.push('"text" must be 200 characters or fewer');
    }
  }

  if (body.column !== undefined && !COLUMNS.includes(body.column)) {
    errors.push(`"column" must be one of: ${COLUMNS.join(', ')}`);
  }

  if (body.priority !== undefined && !PRIORITIES.includes(body.priority)) {
    errors.push(`"priority" must be one of: ${PRIORITIES.join(', ')}`);
  }

  if (body.dueDate !== undefined) {
    if (typeof body.dueDate !== 'string') {
      errors.push('"dueDate" must be a string in YYYY-MM-DD format');
    } else if (body.dueDate && !/^\d{4}-\d{2}-\d{2}$/.test(body.dueDate)) {
      errors.push('"dueDate" must be in YYYY-MM-DD format');
    }
  }

  if (body.subtasks !== undefined) {
    if (!Array.isArray(body.subtasks)) {
      errors.push('"subtasks" must be an array');
    } else {
      body.subtasks.forEach((s, i) => {
        if (typeof s !== 'object' || s === null) {
          errors.push(`subtasks[${i}] must be an object`);
        } else if (typeof s.text !== 'string' || s.text.trim().length === 0) {
          errors.push(`subtasks[${i}].text is required`);
        } else if (s.text.length > 120) {
          errors.push(`subtasks[${i}].text must be 120 characters or fewer`);
        }
      });
    }
  }

  return errors;
}

module.exports = { validateCardBody, validateCardUpdateBody };
