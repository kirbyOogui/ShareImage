"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";

/**
 * EdgeSwipeGuard(touchstartのpreventDefault)だけでは、iOSホーム画面PWA(standalone)の
 * 画面端スワイプ戻るジェスチャー自体を止めきれない端末がある(ジェスチャー認識がDOMの
 * タッチイベントより手前で確定してしまうため)。そのため「ジェスチャーを止める」のではなく
 * 「ジェスチャーの結果起きるアプリ内の戻る遷移そのものを無効化する」という別レイヤーの
 * 対策として、popstate(戻る操作)を検知するたびに現在地へ即座に押し戻す。
 *
 * このアプリの画面遷移は全てLink/router.pushによる「進む」遷移のみで、どこからも
 * router.back()/history.back()を呼んでいないため、観測されるpopstateは全て
 * スワイプ等による意図しない「戻る」とみなしてよい。
 */
export function BackNavigationTrap() {
  const pathname = usePathname();
  const router = useRouter();
  const pathnameRef = useRef(pathname);

  useEffect(() => {
    pathnameRef.current = pathname;
    // 通常の遷移のたびに現在地の複製エントリを1つ積んでおき、
    // 「1つ戻る」操作が来てもまず複製(=同じ画面)に着地するようにする
    window.history.pushState(null, "", pathname);
  }, [pathname]);

  useEffect(() => {
    const handlePopState = () => {
      window.history.pushState(null, "", pathnameRef.current);
      router.replace(pathnameRef.current);
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [router]);

  return null;
}
