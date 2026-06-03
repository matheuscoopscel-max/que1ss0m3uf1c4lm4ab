-- FILE: backend/migrations/010_create_notifications.sql
-- Notificações da comunidade: reações, comentários, menções.

DO $$ BEGIN
  CREATE TYPE notification_type AS ENUM (
    'post_reaction',    -- alguém reagiu ao seu post
    'post_comment',     -- alguém comentou no seu post
    'comment_reply',    -- alguém respondeu seu comentário
    'mention',          -- você foi mencionado (@usuario)
    'new_follower',     -- alguém começou a seguir você (futuro)
    'system'            -- mensagem do sistema
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS notifications (
  id          UUID              PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID              NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  actor_id    UUID              REFERENCES users(id) ON DELETE SET NULL,  -- quem gerou
  type        notification_type NOT NULL,
  post_id     UUID              REFERENCES posts(id) ON DELETE CASCADE,
  comment_id  UUID              REFERENCES comments(id) ON DELETE CASCADE,
  message     TEXT,
  is_read     BOOLEAN           NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ       NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user    ON notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_unread  ON notifications(user_id, is_read) WHERE is_read = false;

-- ── Adiciona coluna hashtags nos posts ────────────────────────────────────────
ALTER TABLE posts ADD COLUMN IF NOT EXISTS hashtags TEXT[] DEFAULT '{}';

-- ── Adiciona coluna parent_post_id para threads/quotes ────────────────────────
ALTER TABLE posts ADD COLUMN IF NOT EXISTS quoted_post_id UUID REFERENCES posts(id) ON DELETE SET NULL;

-- ── Índice para trending (posts com mais reações recentes) ────────────────────
CREATE INDEX IF NOT EXISTS idx_posts_trending ON posts(likes_count DESC, created_at DESC)
  WHERE created_at > NOW() - INTERVAL '48 hours' AND is_hidden = false;

-- ── Função: notifica dono do post ao receber reação ───────────────────────────
CREATE OR REPLACE FUNCTION notify_post_reaction(
  p_post_id UUID, p_actor_id UUID, p_reaction TEXT
) RETURNS VOID AS $$
DECLARE v_owner_id UUID;
BEGIN
  SELECT user_id INTO v_owner_id FROM posts WHERE id = p_post_id;
  -- Não notifica se é o próprio usuário reagindo ao próprio post
  IF v_owner_id IS NOT NULL AND v_owner_id != p_actor_id THEN
    INSERT INTO notifications (user_id, actor_id, type, post_id, message)
    VALUES (v_owner_id, p_actor_id, 'post_reaction', p_post_id, p_reaction)
    ON CONFLICT DO NOTHING;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- ── Função: notifica dono do post ao receber comentário ───────────────────────
CREATE OR REPLACE FUNCTION notify_post_comment(
  p_post_id UUID, p_comment_id UUID, p_actor_id UUID
) RETURNS VOID AS $$
DECLARE v_owner_id UUID;
BEGIN
  SELECT user_id INTO v_owner_id FROM posts WHERE id = p_post_id;
  IF v_owner_id IS NOT NULL AND v_owner_id != p_actor_id THEN
    INSERT INTO notifications (user_id, actor_id, type, post_id, comment_id)
    VALUES (v_owner_id, p_actor_id, 'post_comment', p_post_id, p_comment_id);
  END IF;
END;
$$ LANGUAGE plpgsql;

-- ── Função: notifica ao responder um comentário ───────────────────────────────
CREATE OR REPLACE FUNCTION notify_comment_reply(
  p_parent_comment_id UUID, p_comment_id UUID, p_actor_id UUID, p_post_id UUID
) RETURNS VOID AS $$
DECLARE v_owner_id UUID;
BEGIN
  SELECT user_id INTO v_owner_id FROM comments WHERE id = p_parent_comment_id;
  IF v_owner_id IS NOT NULL AND v_owner_id != p_actor_id THEN
    INSERT INTO notifications (user_id, actor_id, type, post_id, comment_id)
    VALUES (v_owner_id, p_actor_id, 'comment_reply', p_post_id, p_comment_id);
  END IF;
END;
$$ LANGUAGE plpgsql;
