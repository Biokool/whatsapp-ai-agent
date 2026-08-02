-- ============================================
-- LIMPIEZA DE KNOWLEDGE BASE - Supabase
-- Ejecutar en el SQL Editor de Supabase
-- ============================================

-- 1. Eliminar chunks (embeddings)
TRUNCATE TABLE document_chunks CASCADE;

-- 2. Eliminar versiones de documentos
TRUNCATE TABLE document_versions CASCADE;

-- 3. Eliminar documentos
TRUNCATE TABLE documents CASCADE;

-- 4. Eliminar knowledge bases
TRUNCATE TABLE knowledge_bases CASCADE;

-- Verificar que todo esté limpio
SELECT 'document_chunks' as tabla, COUNT(*) as registros FROM document_versions
UNION ALL
SELECT 'document_versions', COUNT(*) FROM document_versions
UNION ALL
SELECT 'documents', COUNT(*) FROM documents
UNION ALL
SELECT 'knowledge_bases', COUNT(*) FROM knowledge_bases;
