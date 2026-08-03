-- Splits DeepSeek, Mistral, and xAI (Grok) out of the shared "OPENAI_COMPATIBLE" bucket into
-- first-class ApiKeyProvider values, each with its own fixed default base URL (same treatment
-- OPENAI already gets). Previously all three shared one OPENAI_COMPATIBLE slot per user, so a
-- user with both a DeepSeek key and, say, an OpenRouter key had no way to guarantee the right
-- one was used for a given model — getUserCredentials() just picked whichever key was marked
-- default / most recently touched, regardless of which model the request was actually for.
--
-- This migration only ADDS enum values — no existing rows change provider, so any
-- OPENAI_COMPATIBLE keys a user already saved for DeepSeek/Mistral/xAI keep working exactly as
-- before (still resolved via the OPENAI_COMPATIBLE path) until the user re-saves them under the
-- new dedicated provider from Settings, which is optional, not required.
ALTER TYPE "ApiKeyProvider" ADD VALUE IF NOT EXISTS 'DEEPSEEK';
ALTER TYPE "ApiKeyProvider" ADD VALUE IF NOT EXISTS 'MISTRAL';
ALTER TYPE "ApiKeyProvider" ADD VALUE IF NOT EXISTS 'XAI';
