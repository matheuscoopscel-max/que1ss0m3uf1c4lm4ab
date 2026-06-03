// FILE: backend/src/middleware/errorHandler.js
// Handler centralizado de erros Express.
// Captura erros lançados em qualquer rota via next(err).

/**
 * @param {Error} err
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export function errorHandler(err, req, res, next) {
  // Erros de validação do express-validator já foram tratados nas rotas;
  // este handler pega erros inesperados (DB, runtime, etc.)

  const status = err.status ?? err.statusCode ?? 500;
  const isDev = process.env.NODE_ENV !== "production";

  console.error(`[Error] ${req.method} ${req.path} →`, err.message);
  if (isDev) console.error(err.stack);

  res.status(status).json({
    success: false,
    message: isDev ? err.message : "Erro interno do servidor.",
    ...(isDev && { stack: err.stack }),
  });
}
