-- 添加source字段到notes表
USE bunnies_dreamworld;

-- 检查source字段是否已存在，如果不存在则添加
SET @sql = IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
     WHERE TABLE_SCHEMA = 'bunnies_dreamworld' 
     AND TABLE_NAME = 'notes' 
     AND COLUMN_NAME = 'source') = 0,
    'ALTER TABLE notes ADD COLUMN source TEXT DEFAULT NULL COMMENT "笔记来源"',
    'SELECT "source字段已存在" as message'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 检查url字段是否已存在，如果不存在则添加
SET @sql = IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
     WHERE TABLE_SCHEMA = 'bunnies_dreamworld' 
     AND TABLE_NAME = 'notes' 
     AND COLUMN_NAME = 'url') = 0,
    'ALTER TABLE notes ADD COLUMN url VARCHAR(500) DEFAULT NULL COMMENT "笔记链接"',
    'SELECT "url字段已存在" as message'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 检查category_tag字段是否已存在，如果不存在则添加
SET @sql = IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
     WHERE TABLE_SCHEMA = 'bunnies_dreamworld' 
     AND TABLE_NAME = 'notes' 
     AND COLUMN_NAME = 'category_tag') = 0,
    'ALTER TABLE notes ADD COLUMN category_tag VARCHAR(100) DEFAULT NULL COMMENT "分类标签"',
    'SELECT "category_tag字段已存在" as message'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SELECT '数据库字段更新完成' as result;
