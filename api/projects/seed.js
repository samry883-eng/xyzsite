import { handleProjectsSeed } from '../../lib/projects-api-handlers.mjs';

export default function handler(req, res) {
  return handleProjectsSeed(req, res);
}
