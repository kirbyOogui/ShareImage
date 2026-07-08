-- PushSubscriptionを個別の共有ではなくギャラリー全体の購読に変更する
-- (このアプリはギャラリーが常に1つだけの仕様のため、共有への紐付けは不要になった)

-- DropForeignKey
ALTER TABLE "PushSubscription" DROP CONSTRAINT "PushSubscription_shareId_fkey";

-- DropIndex
DROP INDEX "PushSubscription_shareId_idx";

-- AlterTable
ALTER TABLE "PushSubscription" DROP COLUMN "shareId";
