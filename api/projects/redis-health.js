import { handleProjectsRedisHealth } from '../../lib/projects-api-handlers.mjs';

export default async function handler(req, res) {
  return handleProjectsRedisHealth(req, res);
}
