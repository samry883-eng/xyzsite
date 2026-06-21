import { handleProjectsCollection } from '../lib/projects-api-handlers.mjs';

export default function handler(req, res) {
  return handleProjectsCollection(req, res);
}
