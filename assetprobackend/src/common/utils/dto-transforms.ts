import { Transform } from 'class-transformer';

/**
 * class-transformer decorator that maps empty-string / whitespace inputs to
 * `undefined` so optional format validators (like `@IsEmail`, `@IsUrl`,
 * `@IsDateString`) pair correctly with `@IsOptional`.
 *
 * Without this, a user clearing an optional email field sends `""`. That
 * passes `@IsOptional` (which only skips null/undefined) and then fails
 * `@IsEmail` with "email must be an email" — even though the field is
 * supposed to be optional.
 *
 * Usage:
 *
 *   @IsOptional()
 *   @EmptyStringToUndefined
 *   @IsEmail()
 *   email?: string;
 *
 * Decorator order doesn't matter for validator metadata, but by convention we
 * list `@IsOptional` → `@EmptyStringToUndefined` → format validator so the
 * intent reads top-to-bottom.
 */
export const EmptyStringToUndefined = Transform(({ value }) =>
  typeof value === 'string' && value.trim() === '' ? undefined : value,
);
