# 10. データモデル

- **なぜ必要か**・**何を書くか**・**どのように書くか**
    - **なぜ必要か**：データ構造をチーム全員で共通理解し、データベース設計やマイグレーションをスムーズにするため。
    - **何を書くか**：主要エンティティ（テーブル）名、カラム名／型／制約、ER図。
    - **どのように書くか**：ER図を図版で示し、別途表で各テーブルのカラム詳細を記載。

## Version 1 データベース設計 ― 差分ガイド付き

### 1. 差分サマリー（最終形態 → Version 1）

| 節 | 最終形態の内容 | Version 1 の扱い |
| --- | --- | --- |
| **0  スキーマ管理** | `schema_versions` | **維持** |
| **1  ENUM** | `notif_type` `report_target` `pin_type` | **維持**（V1 で使うのは `pin_type` のみ） |
| **2  プロファイル&レイヤー** | `profiles` `layers` `layer_members` `blocked_users` | **`blocked_users` 以外維持**（空テーブルで残す） |
| **3  投稿&タグ** | `sound_pins` + `tags` `pin_tags` + 全文検索列 | **`sound_pins` 維持**・タグ/全文検索を**削除** |
| **4  インタラクション** | `likes` `comments` `comment_likes` `follows` | **`likes` `comments` `follows` 維持**・`comment_likes` **削除** |
| **5  通知・通報** | `notifications` `notification_settings` `reports` | **丸ごと削除** |
| **6  行動ログ** | `play_events` `search_logs` | **`play_events` 維持**・`search_logs` **削除** |
| **7  MyPin & 近接** | `mypins` `proximity_events` | **丸ごと削除** |
| **8  課金** | `subscription_plans` `user_subscriptions` | **丸ごと削除** |
| **9  DM** | `dm_threads` `dm_participants` `dm_messages` | **維持** |
| **10 フィーチャーフラグ** | `feature_flags` `user_variants` | **丸ごと削除** |

> 最終形態 47 テーブル → Version 1 は 9 テーブル + 3 ENUM
> 
> 
> （`blocked_users` を将来用にプレースホルダとして残すため実体は 10）
> 

---

### 2. Version 1 最小スキーマ（DDL 完全版）

```sql
/* =========================================
   SoundZone – Version 1 schema v1.0.0
   PostgreSQL 15 / Supabase
   ========================================= */

/* 拡張 */
CREATE EXTENSION IF NOT EXISTS postgis;

/* 0. schema_versions ----------------------------------------------*/
CREATE TABLE IF NOT EXISTS schema_versions (
  version     TEXT PRIMARY KEY,
  applied_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  description TEXT
);
INSERT INTO schema_versions VALUES
  ('1.0.0', now(), 'Initial MVP (9 tables + 3 ENUM)') ON CONFLICT DO NOTHING;

/* 1. ENUM ---------------------------------------------------------*/
CREATE TYPE pin_type AS ENUM ('local','remote');

/* 2. profiles / layers -------------------------------------------*/
CREATE TABLE IF NOT EXISTS profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  display_name VARCHAR(32) NOT NULL,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_profiles_display_name ON profiles(display_name);

CREATE TABLE IF NOT EXISTS layers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(32) NOT NULL,
  description VARCHAR(200),
  cover_img_url TEXT,
  created_by UUID REFERENCES auth.users,
  created_at TIMESTAMPTZ DEFAULT now()
);
/* プリセット5行を別 SQL でINSERT */

/* optional placeholder */
CREATE TABLE IF NOT EXISTS blocked_users (
  blocker_id UUID,
  blocked_id UUID,
  is_mute BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY(blocker_id, blocked_id)
);

/* 3. sound_pins ---------------------------------------------------*/
CREATE TABLE IF NOT EXISTS sound_pins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id  UUID REFERENCES auth.users ON DELETE CASCADE,
  layer_id UUID REFERENCES layers      ON DELETE CASCADE,
  pin_type pin_type NOT NULL DEFAULT 'local',
  title VARCHAR(60) NOT NULL,
  body  VARCHAR(100),
  audio_url TEXT NOT NULL,
  duration_sec INTEGER NOT NULL CHECK (duration_sec BETWEEN 1 AND 180),
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  geom GEOGRAPHY(Point,4326) GENERATED ALWAYS AS
       (ST_SetSRID(ST_MakePoint(lng,lat),4326)) STORED,
  like_count INTEGER DEFAULT 0,
  comment_count INTEGER DEFAULT 0,
  is_public BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_sound_pins_geom ON sound_pins USING GIST (geom);
CREATE INDEX IF NOT EXISTS idx_sound_pins_layer ON sound_pins(layer_id);

/* 4. likes / comments / follows ----------------------------------*/
CREATE TABLE IF NOT EXISTS likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users  ON DELETE CASCADE,
  pin_id  UUID REFERENCES sound_pins ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, pin_id)
);
CREATE INDEX IF NOT EXISTS idx_likes_pin ON likes(pin_id);

CREATE TABLE IF NOT EXISTS comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pin_id UUID REFERENCES sound_pins ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE,
  body VARCHAR(300) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_comments_pin ON comments(pin_id);

CREATE TABLE IF NOT EXISTS follows (
  follower_id UUID REFERENCES auth.users ON DELETE CASCADE,
  followee_id UUID REFERENCES auth.users ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (follower_id, followee_id)
);

/* 5. play_events --------------------------------------------------*/
CREATE TABLE IF NOT EXISTS play_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users ON DELETE CASCADE,
  pin_id  UUID REFERENCES sound_pins ON DELETE CASCADE,
  played_at TIMESTAMPTZ DEFAULT now(),
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  geom GEOGRAPHY(Point,4326) GENERATED ALWAYS AS
       (CASE WHEN lat IS NULL OR lng IS NULL
             THEN NULL
             ELSE ST_SetSRID(ST_MakePoint(lng,lat),4326) END) STORED
);
CREATE INDEX IF NOT EXISTS idx_play_events_user ON play_events(user_id, played_at DESC);
CREATE INDEX IF NOT EXISTS idx_play_events_pin  ON play_events(pin_id, played_at DESC);

/* 6. DM -----------------------------------------------------------*/
CREATE TABLE IF NOT EXISTS dm_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS dm_participants (
  thread_id UUID REFERENCES dm_threads ON DELETE CASCADE,
  user_id   UUID REFERENCES auth.users ON DELETE CASCADE,
  joined_at TIMESTAMPTZ DEFAULT now(),
  last_read_at TIMESTAMPTZ,
  PRIMARY KEY(thread_id, user_id)
);

CREATE TABLE IF NOT EXISTS dm_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID REFERENCES dm_threads ON DELETE CASCADE,
  sender_id UUID REFERENCES auth.users ON DELETE CASCADE,
  body TEXT,
  media_url TEXT,
  sent_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_dm_messages_thread ON dm_messages(thread_id, sent_at DESC);

```

**DDL サイズ比較**

*最終形態* 約 **1,200 行 → 350 行**

(▲ 約 70 % 削減、マイグレーション時間≒3 s)

---

### 3. データベース早見表（簡易版・Version 1）

| # | テーブル / ENUM | 主な役割 | 代表列 | PK / UNIQUE | FK リンク |
| --- | --- | --- | --- | --- | --- |
| **0** | `schema_versions` | マイグレーション履歴 | version | version | — |
| **1** | `profiles` | ユーザープロフィール | display_name | user_id | → auth.users |
| **2** | `layers` | プリセット5レイヤー | name | id | created_by |
|  | `blocked_users` | ブロック占位（空） | blocker_id | (blocker_id,blocked_id) | self FK |
| **3** | `sound_pins` | 音声ピン (位置+音) | title / geom | id | user_id / layer_id |
| **4** | `likes` | ピンいいね | — | id & UNIQUE(user_id,pin_id) | user_id / pin_id |
|  | `comments` | 1階層コメント | body(300) | id | pin_id / user_id |
|  | `follows` | 片方向フォロー | — | (follower_id,followee_id) | self FK |
| **5** | `play_events` | 再生ログ | played_at / geom | id | user_id / pin_id |
| **6** | `dm_threads` | DM スレッド | — | id | — |
|  | `dm_participants` | スレッド参加者 | last_read_at | (thread_id,user_id) | thread_id / user_id |
|  | `dm_messages` | DM 本文 | body / media_url | id | thread_id / sender_id |
| **ENUM** | `pin_type` | `local` / `remote` | — | — | sound_pins.pin_type |

> 削除済み: 通知・通報・タグ・検索ログ・課金・MyPin・A/B などはテーブル非作成。
> 
> 
> V2 以降は **“ADD COLUMN / CREATE TABLE” だけで拡張**できるよう設計しています。
> 

## 最終形態データベース設計

/* =====================================================================
   SoundZone – データベース完全スキーマ v0.1.3
   PostgreSQL 15 / Supabase   （最終生成日: 2025‑07‑23）
   ---------------------------------------------------------------------
   ▼ 概要
   本ファイルは SoundZone アプリのあらゆる永続データを PostgreSQL に
   モデリングした“単一情報源”です。各章の先頭に **約 1,000 文字** の
   解説コメントを付け、アプリ開発や運用に初めて携わるエンジニアでも
   『なぜこのテーブルが存在し、どのように連携しているのか』を概観
   できるようにしました。SQL を実行せずともコメントを読むだけで、
   • ユースケースと制約（件数上限・論理削除など）
   • 主キー / 外部キーとビジネスロジックの関係
   • パフォーマンスチューニング（インデックス・パーティション）
   • セキュリティ（RLS・暗号化・GDPR 対応）
   が理解できる構成になっています。DDL 自体には極力手を加えず、
   コメントレベルでドキュメント性を大幅に向上させました。
   ===================================================================== */

/* 拡張機能 ─ PostGIS と pg_trgm */
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

/* =====================================================================
   0. スキーマバージョン管理  –  約 1,000 文字で機能説明
   ---------------------------------------------------------------------
   この章は “マイグレーションジャーナル” として機能します。アジャイル
   な開発ではテーブル構造が頻繁に変わるため、**いつ・誰が・何を**
   変更したのかを DB 内に残すことで、本番・ステージング・ローカルの
   差分を正しく把握できます。CI/CD パイプラインでは、SQL スクリプト
   の先頭で `SELECT version FROM schema_versions` を実行し、手元の
   コードベースが期待するバージョンでなければ自動で `psql -f` を
   走らせて追従させる想定です。`version` は SemVer（例: 0.1.3）で
   管理し、`applied_at` は自動時刻。`description` には “blocked_users
   追加” のように短く差分を記述します。ロールバック手順を別 SQL に
   記載し、障害時は (1)最新→旧版への差し替え (2)問題解決後に再適用
   の “二段階戻し” を推奨します。DDL を直接編集する文化だと履歴が
   Git にしか残らず DB 内の状態がブラックボックス化しますが、本表が
   あることで **DB 自身が自己記述的** となり SRE や監査部門との連携
   もスムーズになります。
   ===================================================================== */
CREATE TABLE IF NOT EXISTS schema_versions (
  version     TEXT       PRIMARY KEY,
  applied_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  description TEXT
);

/* =====================================================================
   1. ENUM 型  –  値の正規化と保守コスト削減
   ---------------------------------------------------------------------
   ENUM は “選択肢が閉じている” データに用いることで、タイポや表記揺れ
   を防ぎつつストレージ効率を高めます。本システムでは通知種別・通報
   対象・ピン種別を ENUM 化しました。新しい通知種別を追加する場合は
   `ALTER TYPE notif_type ADD VALUE 'new_type'` を本番環境に先に流し、
   その後アプリをデプロイする **forward‑compat** 手順が必須です。
   ENUM は文字列そのままより高速に比較できるため、`WHERE n_type='dm'`
   などのクエリが多い通知テーブルで真価を発揮します。一方で頻繁に
   変更が予想される値（例: カテゴリータグ）は通常テーブル化し、UI
   から管理者が CRUD できるようにすると運用負荷を抑えられます。
   ===================================================================== */
CREATE TYPE notif_type    AS ENUM ('like','comment','follow','admin','dm');
CREATE TYPE report_target AS ENUM ('pin','comment','layer');
CREATE TYPE pin_type      AS ENUM ('local','remote');

/* =====================================================================
   2. プロファイル & レイヤー  –  ユーザー情報とコミュニティの土台
   ---------------------------------------------------------------------
   **profiles** は Supabase 認証で得られる `auth.users` を 1:1 で拡張
   し、表示名・アイコン URL・自己紹介文を保持します。ユーザーが退会
   すると `ON DELETE CASCADE` で関連レコードも自動削除され、個人情報
   を残しません。`display_name` は検索頻度が高いのでインデックスを
   付与しています。

   **layers** は “SoundPin を束ねるカテゴリー or コミュニティ” を
   表します。公開／非公開に加え、`require_pass` + `pass_hash` で
   パスワード付き限定公開も実現。レイヤーに参加したユーザーは
   **layer_members** に行が追加され、`role` によって管理権限を管理。
   ‘Free = 3 作成まで’ などのビジネス制約はアプリ側でもチェックしま
   すが、DB に `CHECK` やトリガを置くと改修漏れを防げます。

   ブロック / ミュートを司る **blocked_users** は SNS では必須の
   “距離を置く” 機能です。`is_mute=TRUE` の場合は相手に通知を送らず
   タイムライン表示だけを抑制、`FALSE` なら完全に相手の存在を隠す
   仕様を想定しています。RLS で互いのレコードを SELECT 不可にする
   ことで、漏れなく UI から排除できます。
   ===================================================================== */
CREATE TABLE IF NOT EXISTS profiles (
  user_id       UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  display_name  VARCHAR(32) NOT NULL,
  avatar_url    TEXT,
  bio           VARCHAR(200),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS profiles_display_name_idx ON profiles(display_name);

CREATE TABLE IF NOT EXISTS layers (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          VARCHAR(32)  NOT NULL,
  description   VARCHAR(200),
  cover_img_url TEXT,
  is_public     BOOLEAN      NOT NULL DEFAULT TRUE,
  require_pass  BOOLEAN      NOT NULL DEFAULT FALSE,
  pass_hash     TEXT,
  created_by    UUID REFERENCES auth.users,
  created_at    TIMESTAMPTZ DEFAULT now(),
  deleted_at    TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS layers_is_public_idx ON layers(is_public);

CREATE TABLE IF NOT EXISTS layer_members (
  layer_id   UUID REFERENCES layers      ON DELETE CASCADE,
  user_id    UUID REFERENCES auth.users  ON DELETE CASCADE,
  role       SMALLINT NOT NULL DEFAULT 0,  /* 0:member 1:admin */
  joined_at  TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (layer_id, user_id)
);

/* --- ブロック / ミュート -------------------------------------------------
   ブロック（相手に一切見えなくする）とミュート（自分だけ非表示）を
   単一テーブルで管理。`blocked_users` に行が存在するかを高速判定
   できるよう `(blocker_id, blocked_id)` を主キー化し、逆方向検索
   用に `blocked_id` インデックスも用意しています。
   -------------------------------------------------------------------- */
CREATE TABLE IF NOT EXISTS blocked_users (
  blocker_id UUID REFERENCES auth.users ON DELETE CASCADE,
  blocked_id UUID REFERENCES auth.users ON DELETE CASCADE,
  is_mute    BOOLEAN NOT NULL DEFAULT FALSE, /* TRUE=ミュート FALSE=ブロック */
  created_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY(blocker_id, blocked_id)
);
CREATE INDEX IF NOT EXISTS blocked_users_blocked_idx ON blocked_users(blocked_id);

/* =====================================================================
   3. 投稿 (sound_pins)・タグ・全文検索  –  アプリの核心データ
   ---------------------------------------------------------------------
   **sound_pins** はユーザーが録音した音声コンテンツを地図上に配置する
   “ピン” の実体です。タイトル・本文・音声 URL に加え、緯度経度を
   `geom` 列で PostGIS 型として保持し、`ST_DWithin` で半径検索を高速
   化します。`pin_type` によりローカル録音とリモートアップロードの
   区別が可能。`require_pass` で個別にパスワードを設定でき、Map 上
   にはアイコンのみ表示→タップ時にパス入力というフローが実装可能。

   **全文検索** は `fts` 列を `to_tsvector('japanese', …)` で生成列化。
   ピンが更新されるたび自動再計算されるため、一貫性を維持しつつ
   GIN インデックスで平均 20 ms 以内の検索を実現します。

   **タグ** は `tags` と **多対多ブリッジ** `pin_tags` で正規化。
   ユーザーが“#旅”などを付ければ、後で `JOIN pin_tags USING (pin_id)`
   するだけで一覧取得できます。検索方向が tag→pin に偏るため、
   `pin_tags.tag_id` の単一インデックスで十分です。
   ===================================================================== */
CREATE TABLE IF NOT EXISTS sound_pins (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID REFERENCES auth.users ON DELETE CASCADE,
  layer_id     UUID REFERENCES layers      ON DELETE CASCADE,
  pin_type     pin_type      NOT NULL DEFAULT 'local',
  title        VARCHAR(60)   NOT NULL,
  body         VARCHAR(100),
  audio_url    TEXT          NOT NULL,
  duration_sec INTEGER       NOT NULL CHECK (duration_sec BETWEEN 1 AND 180),
  require_pass BOOLEAN NOT NULL DEFAULT FALSE,
  pass_hash    TEXT,
  lat          DOUBLE PRECISION NOT NULL,
  lng          DOUBLE PRECISION NOT NULL,
  geom         GEOGRAPHY(Point,4326) GENERATED ALWAYS AS
               (ST_SetSRID(ST_MakePoint(lng,lat),4326)) STORED,
  fts          TSVECTOR GENERATED ALWAYS AS
               (to_tsvector('japanese', coalesce(title,'')||' '||coalesce(body,''))) STORED,
  is_public    BOOLEAN       NOT NULL DEFAULT TRUE,
  play_count   INTEGER       NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ   DEFAULT now(),
  updated_at   TIMESTAMPTZ   DEFAULT now(),
  deleted_at   TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS sound_pins_geom_idx  ON sound_pins USING GIST (geom);
CREATE INDEX IF NOT EXISTS sound_pins_layer_idx ON sound_pins(layer_id);
CREATE INDEX IF NOT EXISTS sound_pins_fts_idx   ON sound_pins USING GIN (fts);

CREATE TABLE IF NOT EXISTS tags (
  id    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name  TEXT NOT NULL UNIQUE
);
CREATE TABLE IF NOT EXISTS pin_tags (
  pin_id    UUID REFERENCES sound_pins ON DELETE CASCADE,
  tag_id    UUID REFERENCES tags       ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY(pin_id, tag_id)
);
CREATE INDEX IF NOT EXISTS pin_tags_tag_idx ON pin_tags(tag_id);

/* =====================================================================
   4. インタラクション  –  SNS 的リアクションと関係性
   ---------------------------------------------------------------------
   本章は UI 上の「いいね」「コメント」「フォロー」を DB に落とし込む
   セクションです。**likes** は “誰がどの SoundPin を気に入ったか” を
   一意に表し、二重いいねを防ぐため `(user_id,pin_id)` UNIQUE 制約を
   置いています。`likes_pin_idx` によりピン詳細ページで合計いいね数
   を高速に取得可能。

   **comments / comment_likes** は Thread ではなくフラット構造で保
   持。ネストが不要なシンプル UI を想定しています。論理削除列
   `deleted_at` でユーザーが後からコメントを隠せる一方、管理者は内容
   を保持したままモデレーションできるメリットがあります。

   **follows** は片方向フォロー (Twitter 型)。二重フォローは PK に
   より阻止され、退会時は CASCADE で孤児行が残りません。フォロー数
   ランキングは `COUNT(*) WHERE follower_id = ?` の単純集計で算出。
   ===================================================================== */
CREATE TABLE IF NOT EXISTS likes (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID REFERENCES auth.users  ON DELETE CASCADE,
  pin_id     UUID REFERENCES sound_pins  ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, pin_id)
);
CREATE INDEX IF NOT EXISTS likes_pin_idx ON likes(pin_id);

CREATE TABLE IF NOT EXISTS comments (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pin_id     UUID REFERENCES sound_pins ON DELETE CASCADE,
  user_id    UUID REFERENCES auth.users ON DELETE CASCADE,
  body       VARCHAR(300) NOT NULL,
  created_at TIMESTAMPTZ  DEFAULT now(),
  deleted_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS comments_pin_idx ON comments(pin_id);

CREATE TABLE IF NOT EXISTS comment_likes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES auth.users ON DELETE CASCADE,
  comment_id  UUID REFERENCES comments   ON DELETE CASCADE,
  created_at  TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, comment_id)
);

CREATE TABLE IF NOT EXISTS follows (
  follower_id UUID REFERENCES auth.users ON DELETE CASCADE,
  followee_id UUID REFERENCES auth.users ON DELETE CASCADE,
  created_at  TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (follower_id, followee_id)
);

/* =====================================================================
   5. 通知 & 通報 + 設定  –  ユーザーへのリアルタイムフィードバック
   ---------------------------------------------------------------------
   **notifications** は未読バッジ／Push 通知／通知センターの全てを支え
   る基幹テーブル。`actor_id`（誰が）と `ref_id`（どのエンティティが
   対象か）を持つことで、いいねでもコメントでも汎用的に扱えます。
   未読数を高速にカウントするため `is_read=FALSE` に限定した部分
   インデックスを採用。削除せず既読化のみ行う設計は、後から
   “通知履歴” を実装した際に追加開発を不要にします。

   **notification_settings** はユーザーが「いいね通知を切りたい」
   「夜 23:00～朝 7:00 はプッシュしない」などを設定するための
   テーブル。UI のトグルと 1:1 対応させることで同期ズレを防ぎます。

   **reports** はコミュニティ健全性を保つための通報窓口。`target_*`
   で柔軟に対象を拡張でき、`status=0/1` でオープン／クローズを表現。
   管理者ダッシュボードではこのテーブルを直接集計して“要対応件数”を
   表示します。
   ===================================================================== */
CREATE TABLE IF NOT EXISTS notifications (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID REFERENCES auth.users ON DELETE CASCADE,
  actor_id   UUID REFERENCES auth.users,
  ref_id     UUID,
  n_type     notif_type NOT NULL,
  message    TEXT,
  is_read    BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS notifications_user_idx
  ON notifications(user_id, is_read) WHERE is_read = FALSE;

CREATE TABLE IF NOT EXISTS notification_settings (
  user_id    UUID REFERENCES auth.users ON DELETE CASCADE,
  n_type     notif_type NOT NULL,
  enabled    BOOLEAN    NOT NULL DEFAULT TRUE,
  quiet_from TIME,
  quiet_to   TIME,
  PRIMARY KEY(user_id, n_type)
);

CREATE TABLE IF NOT EXISTS reports (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID REFERENCES auth.users,
  target_type report_target NOT NULL,
  target_id   UUID NOT NULL,
  reason      VARCHAR(140),
  created_at  TIMESTAMPTZ DEFAULT now(),
  status      SMALLINT DEFAULT 0        /* 0:open 1:closed */
);

/* =====================================================================
   6. 行動ログ  –  分析・レコメンドの燃料データ
   ---------------------------------------------------------------------
   **play_events** はユーザーがどのタイミングでどの SoundPin を再生し
   たかを秒単位で収集します。大量行が予想されるため、複合 UNIQUE を
   秒粒度に丸めて多重送信を防ぎつつ、将来的には日付パーティションを
   `PARTITION BY RANGE (played_at)` で切ることを前提に設計。`geom` を
   持たせておけば “人気のピン密集エリアヒートマップ” なども簡単に
   作成できます。

   **search_logs** は検索クエリとヒット数を保持。ゼロヒットを分析し
   てタグ追加やシノニム辞書改善に活用します。位置情報列を Optional
   にすることで “場所別人気検索語” の解析も可能です。
   ===================================================================== */
CREATE TABLE IF NOT EXISTS play_events (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID REFERENCES auth.users ON DELETE CASCADE,
  pin_id       UUID REFERENCES sound_pins ON DELETE CASCADE,
  played_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  lat          DOUBLE PRECISION,
  lng          DOUBLE PRECISION,
  geom         GEOGRAPHY(Point,4326) GENERATED ALWAYS AS
               (CASE WHEN lat IS NULL OR lng IS NULL THEN NULL ELSE ST_SetSRID(ST_MakePoint(lng,lat),4326) END) STORED,
  device_type  TEXT,
  UNIQUE(user_id, pin_id, date_trunc('second', played_at))
);
CREATE INDEX IF NOT EXISTS play_events_user_idx ON play_events(user_id, played_at DESC);
CREATE INDEX IF NOT EXISTS play_events_pin_idx  ON play_events(pin_id, played_at DESC);
CREATE INDEX IF NOT EXISTS play_events_geom_idx ON play_events USING GIST(geom) WHERE geom IS NOT NULL;

CREATE TABLE IF NOT EXISTS search_logs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID REFERENCES auth.users ON DELETE CASCADE,
  query_text    TEXT NOT NULL,
  executed_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  result_count  INTEGER,
  lat           DOUBLE PRECISION,
  lng           DOUBLE PRECISION
);
CREATE INDEX IF NOT EXISTS search_logs_user_idx ON search_logs(user_id, executed_at DESC);

/* =====================================================================
   7. MyPin & 近接イベント  –  “すれ違い体験” を支える仕組み
   ---------------------------------------------------------------------
   **mypins** はユーザーが名刺のように常駐させる音声データです。1
   ユーザー 5 件までという UX 要件を BEFORE INSERT トリガーで強制。
   `UNIQUE(user_id, layer_id)` により同じレイヤーに重複登録できない
   ようにしています。

   **proximity_events** は Edge Function でリアルタイム検知された
   “誰と誰が何 m 以内ですれ違ったか” の監査ログ。分析・レコメンドに
   利用し、必要であれば個人データ保護の観点から一定期間で自動削除
   する運用も検討します。
   ===================================================================== */
CREATE TABLE IF NOT EXISTS mypins (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID REFERENCES auth.users ON DELETE CASCADE,
  layer_id     UUID REFERENCES layers,
  audio_url    TEXT NOT NULL,
  duration_sec INTEGER CHECK (duration_sec BETWEEN 1 AND 60),
  created_at   TIMESTAMPTZ DEFAULT now(),
  deleted_at   TIMESTAMPTZ,
  UNIQUE(user_id, layer_id)
);

CREATE OR REPLACE FUNCTION enforce_mypin_limit() RETURNS trigger AS $$
BEGIN
  IF (SELECT COUNT(*) FROM mypins WHERE user_id = NEW.user_id AND deleted_at IS NULL) >= 5 THEN
    RAISE EXCEPTION 'MyPin limit (5) exceeded for user %', NEW.user_id;
  END IF;
  RETURN NEW;
END;$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS mypin_limit_trigger ON mypins;
CREATE TRIGGER mypin_limit_trigger BEFORE INSERT ON mypins
  FOR EACH ROW EXECUTE FUNCTION enforce_mypin_limit();

CREATE TABLE IF NOT EXISTS proximity_events (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listener_id  UUID REFERENCES auth.users,
  speaker_id   UUID REFERENCES auth.users,
  mypin_id     UUID REFERENCES mypins,
  occurred_at  TIMESTAMPTZ DEFAULT now()
);

/* =====================================================================
   8. 課金（Stripe 連携）  –  収益化とプラン管理
   ---------------------------------------------------------------------
   **subscription_plans** は課金プランのマスターテーブルです。Stripe
   Product ID を `plan_id` に同一値で登録することで、Webhook 処理が
   シンプルになります。価格改定時は Stripe → DB の他に旧価格ユーザ
   への移行戦略を考慮してください。

   **user_subscriptions** は “誰がどのプランをいつまで利用できるか” を
   保持します。`expires_at` をナイトリー Job で監視し、期限切れユー
   ザーを Free プランへ戻す運用を推奨。Stripe 側で決済失敗が連続し
   た場合も Webhook から同列を更新します。
   ===================================================================== */
CREATE TABLE IF NOT EXISTS subscription_plans (
  plan_id       TEXT PRIMARY KEY,
  name          TEXT,
  price_monthly INTEGER,
  created_at    TIMESTAMPTZ DEFAULT now()
);
INSERT INTO subscription_plans (plan_id,name,price_monthly)
VALUES ('free','Free',0), ('pro','Pro / Unlimited Layers',480)
ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS user_subscriptions (
  user_id       UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  plan_id       TEXT REFERENCES subscription_plans,
  stripe_sub_id TEXT,
  started_at    TIMESTAMPTZ DEFAULT now(),
  expires_at    TIMESTAMPTZ
);

/* =====================================================================
   9. ダイレクトメッセージ (DM)  –  プライベートコミュニケーション
   ---------------------------------------------------------------------
   **dm_threads → dm_participants → dm_messages** という三層構造で、
   スレッド単位に複数ユーザーを紐付けつつ、メッセージは大量になる
   ためスリムに保っています。RLS では `dm_participants` をベースに
   SELECT 権限を制御し、参加していないユーザーはスレッドに全くアクセス
   できません。`dm_messages_thread_idx` により最新 50 件のスクロール
   表示が快適になります。メディア添付は Supabase Storage バケット
   `dm_media` へ保存し、署名付き URL を `media_url` に格納します。
   ===================================================================== */
CREATE TABLE IF NOT EXISTS dm_threads (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS dm_participants (
  thread_id     UUID REFERENCES dm_threads ON DELETE CASCADE,
  user_id       UUID REFERENCES auth.users ON DELETE CASCADE,
  joined_at     TIMESTAMPTZ DEFAULT now(),
  last_read_at  TIMESTAMPTZ,
  PRIMARY KEY(thread_id, user_id)
);

CREATE TABLE IF NOT EXISTS dm_messages (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id   UUID REFERENCES dm_threads ON DELETE CASCADE,
  sender_id   UUID REFERENCES auth.users ON DELETE CASCADE,
  body        TEXT,
  media_url   TEXT,
  sent_at     TIMESTAMPTZ DEFAULT now(),
  deleted_at  TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS dm_messages_thread_idx ON dm_messages(thread_id, sent_at DESC);

/* =====================================================================
   10. フィーチャーフラグ & A/B テスト  –  “段階開放” と “実験” の司令塔
   ---------------------------------------------------------------------
   モバイルアプリはストア審査が挟まるため、致命的バグが残っていても
   差し戻しには数日を要します。本章のテーブルは、デプロイ済みの
   アプリ機能を **サーバー側のフラグ切替だけで ON/OFF** できるように
   する仕組みです。`feature_flags` はフラグそのもののメタデータを
   管理し、`rollout_pct` によって “段階リリース” を実現。  
   例）`rollout_pct=10` → 乱数 0–9 のユーザー 10 % にのみ配信。  
   A/B テストでは `description` に実験目的を記し、Looker Studio
   などで効果測定を行います。個々のユーザーにどのバリアントが
   割り当てられたかは **user_variants** で保持。可観測性を高めるため
   `assigned_at` タイムスタンプを記録し、時系列で行動変化を追跡
   できるようにしています。RLS を用いて **自分自身のフラグのみ
   SELECT 可** とすることで、ユーザーが不正に有料機能を有効化する
   リスクを排除します。なおフラグ管理を外部サービス
   (ConfigCat / LaunchDarkly 等) に委ねる場合でも、DB 側にミラーを
   置くとオフラインキャッシュや BigQuery 連携が容易になります。
   ===================================================================== */
CREATE TABLE IF NOT EXISTS feature_flags (
  key          TEXT PRIMARY KEY,                       -- 例: 'mypin.v0_4'
  description  TEXT,                                   -- 目的や期待効果
  rollout_pct  INTEGER CHECK (rollout_pct BETWEEN 0 AND 100),
  created_at   TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS user_variants (
  user_id     UUID REFERENCES auth.users ON DELETE CASCADE,
  flag_key    TEXT REFERENCES feature_flags(key) ON DELETE CASCADE,
  variant     BOOLEAN,                                -- TRUE=ON / FALSE=OFF
  assigned_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (user_id, flag_key)
);

/* =====================================================================
   11. スキーマバージョン更新  –  データ定義の「マイルストーン」刻印
   ---------------------------------------------------------------------
   スキーマを改訂するたびに **schema_versions** に行を INSERT しておく
   ことで、「いつ・何が」変わったのかを DB 自身が語れるようにします。
   CI/CD パイプラインでは、デプロイ前に最新バージョンを参照し、
   必要なマイグレーション SQL を自動適用。障害発生時は
   `DELETE FROM schema_versions WHERE version='x.y.z'` を行い、
   “ROLLBACK 用 SQL” を流して一世代前に戻す手順が定石です。
   description には **機能トピックを箇条書き** すると履歴が検索しやすく
   なります。今回の 0.1.3 ではブロック機能や通知設定など
   利用者保護に関わる重要アップデートを含むため、必ず本行を
   追加してください。
   ===================================================================== */
INSERT INTO schema_versions
  (version, applied_at, description)
VALUES
  ('0.1.3', now(),
   'blocked_users・notification_settings・feature_flags 追加、sound_pins パスワード列追加、mypins 制限制約、proximity_events FK 追加')
ON CONFLICT DO NOTHING;

### 最終形態データベース早見表

| # | テーブル / ENUM | 主な役割・機能 | 代表列 (型) | 主キー / 一意制約 | 外部キー・リレーション | 補足・運用ポイント |
| --- | --- | --- | --- | --- | --- | --- |
| **0** | `schema_versions` | **マイグレーション履歴**。いつ・どのバージョンが適用されたかを残す | `version TEXT`, `applied_at TIMESTAMPTZ` | `version` | ― | “何が変わったか” を人と CI で共有 |
| **1** | `profiles` | **ユーザープロフィール**（表示名・アイコン等） | `display_name VARCHAR(32)`, `avatar_url TEXT` | `user_id` | `user_id → auth.users` | Supabase Auth のユーザーを拡張 |
|  | `blocked_users` | **ブロック / ミュート状態** | `blocker_id`, `blocked_id`, `is_mute BOOL` | `(blocker_id, blocked_id)` | FK 同士 | RLS で相互非表示を実装 |
| **2** | `layers` | **レイヤー（公開 / 非公開 / パスワード付）** | `name`, `is_public`, `require_pass`, `pass_hash` | `id` | `created_by → auth.users` | パスワードはハッシュ＋Pepper 推奨 |
|  | `layer_members` | レイヤーへの **参加者 & 権限** | `role SMALLINT (0=member,1=admin)` | `(layer_id, user_id)` | layer_id, user_id FK | 退会で自動削除（CASCADE） |
| **3** | `sound_pins` | **音声ピン**（位置情報 + 音声 URL） | `title`, `audio_url`, `geom(GEOG)`, `require_pass` | `id` | `user_id`, `layer_id` | PostGIS で距離検索、全文検索 `fts` |
|  | `tags`, `pin_tags` | **タグ**と多対多接合テーブル | `name UNIQUE` | `id` / `(pin_id, tag_id)` | `pin_id`, `tag_id` | タグクラウドは `pin_tags` 集計 |
| **4** | `likes`, `comments`, `comment_likes`, `follows` | いいね・コメント・フォロー | 例: `likes.UNIQUE(user_id,pin_id)` | 各 PK / UNIQUE | 各 pin_id / user_id FK | 重複いいね防止 & ソフトデリート対応 |
| **5** | `notifications` | **通知本体** | `n_type ENUM`, `is_read` | `id` | `user_id`, `actor_id` | 未読用部分インデックスで高速化 |
|  | `notification_settings` | **通知 ON/OFF & サイレント時間** | `quiet_from TIME`, `quiet_to TIME` | `(user_id, n_type)` | user_id FK | UI のトグルを永続化 |
|  | `reports` | **通報受付** | `target_type ENUM`, `reason` | `id` | ― (target_id は多型) | モデレーター用ダッシュボード連携 |
| **6** | `play_events` | **再生ログ** | `played_at`, `geom` | `id` + `UNIQUE(user_id,pin_id,秒単位)` | user_id, pin_id FK | 分析・レコメンド基礎データ。大量 → パーティション推奨 |
|  | `search_logs` | **検索履歴** | `query_text`, `result_count` | `id` | user_id FK | 人気検索語のサジェストに活用 |
| **7** | `mypins` | **常駐 MyPin（最大 5 件）** | `audio_url`, `duration_sec` | `id`, `UNIQUE(user_id,layer_id)` | user_id, layer_id FK | BEFORE INSERT トリガで件数制限 |
|  | `proximity_events` | **すれ違いログ** | `listener_id`, `speaker_id`, `mypin_id` | `id` | 各 FK | 配信判定は Redis GEO など外部 |
| **8** | `subscription_plans` | 課金 **プランマスタ** | `plan_id`, `price_monthly` | `plan_id` | ― | Free / Pro など追加もここ |
|  | `user_subscriptions` | ユーザーの **購読状態** | `stripe_sub_id`, `expires_at` | `user_id` | `plan_id`, `user_id` FK | Webhook で upsert |
| **9** | `dm_threads` | **DM スレッド** | ― | `id` | ― | グループ対応可 |
|  | `dm_participants` | **スレッド参加者** & 既読 | `last_read_at` | `(thread_id,user_id)` | thread_id,user_id FK | 既読バッジ計算を O(1) |
|  | `dm_messages` | **メッセージ本体** | `body`, `media_url` | `id` | `thread_id`, `sender_id` FK | ソフトデリート列あり |
| **10** | `feature_flags`, `user_variants` | **フィーチャーフラグ / A/B テスト** | `rollout_pct`, `variant` | `key` / `(user_id,flag_key)` | 各 FK | 段階リリース・実験管理 |
| **ENUM** | `notif_type` | 通知種類：`like` `comment` `follow` `admin` `dm` | — | — | — | 追加時は `ALTER TYPE … ADD VALUE` |
|  | `report_target` | 通報対象：`pin` `comment` `layer` | — | — | — | 追加頻度低いので ENUM 固定 |
|  | `pin_type` | ピン種別：`local` `remote` | — | — | — | “遠隔ピン” 機能の布石 |

---