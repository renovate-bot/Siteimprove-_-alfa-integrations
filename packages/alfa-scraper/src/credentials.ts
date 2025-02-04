import type { Equatable } from "@siteimprove/alfa-equatable";
import type { Serializable } from "@siteimprove/alfa-json";

import type * as json from "@siteimprove/alfa-json";

/**
 * @public
 */
export class Credentials implements Equatable, Serializable {
  public static of(username: string, password: string): Credentials {
    return new Credentials(username, password);
  }

  private readonly _username: string;
  private readonly _password: string;

  protected constructor(username: string, password: string) {
    this._username = username;
    this._password = password;
  }

  public get username(): string {
    return this._username;
  }

  public get password(): string {
    return this._password;
  }

  public equals(value: unknown): value is this {
    return (
      value instanceof Credentials &&
      value._username === this._username &&
      value._password === this._password
    );
  }

  public toJSON(): Credentials.JSON {
    return {
      username: this._username,
      password: this._password,
    };
  }

  public toString(): string {
    return `${this._username}:${this._password}`;
  }
}

/**
 * @public
 */
export namespace Credentials {
  export interface JSON {
    [key: string]: json.JSON;
    username: string;
    password: string;
  }
}
