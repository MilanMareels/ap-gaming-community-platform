-- Training blocks become VOD review blocks; renaming the value keeps any blocks already planned
ALTER TYPE "PlanningBlockType" RENAME VALUE 'PRACTICE' TO 'VOD';
