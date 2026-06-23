let config = null;

export async function loadConfig() {
  if (config) return config;

  try {
    const response = await fetch('http://localhost:8000/api/config');
    config = await response.json();
    return config;
  } catch (error) {
    console.error('Failed to load config from gateway:', error);
    throw error;
  }
}

export function getConfig() {
  if (!config) {
    throw new Error('Config not loaded. Call loadConfig() first.');
  }
  return config;
}
