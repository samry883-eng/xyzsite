import { handleProjectsRedisHealth } from '../../lib/projects-api-handlers.mjs';

export default function handler(req, res) {
  return handleProjectsRedisHealth(req, res);
}
