// FILE: frontend/src/lib/pluginRegistry.js
// OmniMedia — Registro em memória de plugins carregados e validados.
// Centraliza acesso às instâncias ativas; não persiste entre reloads
// (os plugins são re-carregados pelo pluginLoader ao montar o app).

/** @type {Map<string, import('../types/plugin').PluginInstance>} */
const registry = new Map();

/** Lista de métodos obrigatórios no contrato de plugin */
const REQUIRED_METHODS = ["search", "getDetails", "getPagesOrStream"];

/**
 * Valida se um objeto cumpre o contrato PluginInstance.
 * @param {unknown} instance
 * @param {string} slug - para mensagens de erro mais claras
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validatePluginContract(instance, slug) {
  const errors = [];

  if (!instance || typeof instance !== "object") {
    return { valid: false, errors: [`Plugin "${slug}": export padrão deve ser um objeto.`] };
  }

  for (const method of REQUIRED_METHODS) {
    if (typeof instance[method] !== "function") {
      errors.push(`Plugin "${slug}": método obrigatório "${method}" ausente ou não é uma função.`);
    }
  }

  if (!instance.slug || typeof instance.slug !== "string") {
    errors.push(`Plugin "${slug}": propriedade "slug" (string) ausente.`);
  }

  if (!instance.name || typeof instance.name !== "string") {
    errors.push(`Plugin "${slug}": propriedade "name" (string) ausente.`);
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Registra uma instância de plugin validada.
 * @param {string} slug
 * @param {import('../types/plugin').PluginInstance} instance
 */
export function registerPlugin(slug, instance) {
  registry.set(slug, instance);
}

/**
 * Remove um plugin do registro.
 * @param {string} slug
 */
export function unregisterPlugin(slug) {
  registry.delete(slug);
}

/**
 * Retorna a instância de um plugin pelo slug.
 * @param {string} slug
 * @returns {import('../types/plugin').PluginInstance | undefined}
 */
export function getPlugin(slug) {
  return registry.get(slug);
}

/**
 * Retorna todos os plugins registrados.
 * @returns {import('../types/plugin').PluginInstance[]}
 */
export function getAllPlugins() {
  return Array.from(registry.values());
}

/**
 * Verifica se um plugin está registrado e ativo.
 * @param {string} slug
 * @returns {boolean}
 */
export function isPluginLoaded(slug) {
  return registry.has(slug);
}

/**
 * Retorna o número de plugins atualmente carregados.
 * @returns {number}
 */
export function getLoadedCount() {
  return registry.size;
}
