-- Drop chapters table (power tier unlock logic removed)
drop table if exists chapters;

-- Rename levels to sections
alter table levels rename to sections;

-- Rename foreign key column on items
alter table items rename column level_id to section_id;
