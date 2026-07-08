/** アップロードされたファイル自体が形式的に不正な場合(拡張子偽装・サイズ超過等)。 */
export class MediaValidationError extends Error {}

/** ファイル形式は正しいが、変換処理自体が失敗した場合(破損PDF・ページ数超過等)。 */
export class MediaConversionError extends Error {}
