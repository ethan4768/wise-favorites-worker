DROP TABLE IF EXISTS favorite;
CREATE TABLE "favorite" (
  "id" varchar(8) NOT NULL,
  "url" TEXT NOT NULL,
  "title" TEXT,
  "description" TEXT,
  "image" TEXT,
  "created_at" datetime DEFAULT current_timestamp,
  PRIMARY KEY ("id")
);

DROP TABLE IF EXISTS favorite_tags;
CREATE TABLE "favorite_tags" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "favorite_id" varchar(8) NOT NULL,
  "tag" TEXT NOT NULL
);

CREATE INDEX "idx_tag"
ON "favorite_tags" (
  "tag"
);