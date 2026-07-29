WITH
telemetry AS (
  SELECT
    COUNT(DISTINCT CASE WHEN name = 'visited' THEN session_id END) AS users,
    COUNT(DISTINCT CASE WHEN name = 'link_copied' THEN context END) AS links_copied,
    COUNT(DISTINCT CASE WHEN name = 'owner_opened' THEN context END) AS owner_opened,
    COUNT(DISTINCT CASE WHEN name = 'returned' THEN session_id END) AS returned,
    COUNT(DISTINCT CASE
      WHEN name = 'visited' AND occurred_on >= date('now', '-6 days') THEN session_id
    END) AS users_7d
  FROM product_events
),
box_counts AS (
  SELECT
    COUNT(*) AS boxes_created,
    COUNT(DISTINCT creator_session_id) AS owners,
    COUNT(CASE WHEN created_at >= unixepoch() - (7 * 86400) THEN 1 END) AS boxes_7d
  FROM boxes
  WHERE status <> 'hidden'
),
reaction_counts AS (
  SELECT
    COUNT(*) AS reactions,
    COUNT(DISTINCT reactions.session_id) AS reactors,
    COUNT(DISTINCT reactions.box_id) AS boxes_with_reactions,
    COUNT(CASE WHEN reactions.kind = 'clap' THEN 1 END) AS clap_reactions,
    COUNT(CASE WHEN reactions.kind = 'more' THEN 1 END) AS more_reactions,
    COUNT(CASE WHEN reactions.kind = 'useful' THEN 1 END) AS useful_reactions,
    COUNT(CASE WHEN reactions.kind = 'thanks' THEN 1 END) AS thanks_reactions
  FROM reactions
  JOIN boxes ON boxes.id = reactions.box_id
  WHERE boxes.status <> 'hidden'
),
deep_boxes AS (
  SELECT COUNT(*) AS boxes_with_5_reactors
  FROM (
    SELECT reactions.box_id
    FROM reactions
    JOIN boxes ON boxes.id = reactions.box_id
    WHERE boxes.status <> 'hidden'
    GROUP BY reactions.box_id
    HAVING COUNT(DISTINCT reactions.session_id) >= 5
  )
),
repeat_owners AS (
  SELECT COUNT(*) AS repeat_owners
  FROM (
    SELECT creator_session_id
    FROM boxes
    WHERE status <> 'hidden'
    GROUP BY creator_session_id
    HAVING COUNT(*) >= 2
  )
)
SELECT
  telemetry.*,
  box_counts.*,
  reaction_counts.*,
  deep_boxes.boxes_with_5_reactors,
  repeat_owners.repeat_owners
FROM telemetry, box_counts, reaction_counts, deep_boxes, repeat_owners;
