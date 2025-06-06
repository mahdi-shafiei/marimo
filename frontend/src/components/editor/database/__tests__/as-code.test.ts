/* Copyright 2024 Marimo. All rights reserved. */
import { describe, expect, it } from "vitest";
import { type ConnectionLibrary, generateDatabaseCode } from "../as-code";
import type { DatabaseConnection } from "../schemas";
import { prefixSecret } from "../secrets";

describe("generateDatabaseCode", () => {
  // Test fixtures
  const basePostgres: DatabaseConnection = {
    type: "postgres",
    host: "localhost",
    port: 5432,
    database: "test",
    username: "user",
    password: "pass",
    ssl: true,
  };

  const baseMysql: DatabaseConnection = {
    type: "mysql",
    host: "localhost",
    port: 3306,
    database: "test",
    username: "user",
    password: "pass",
    ssl: true,
  };

  const sqliteConnection: DatabaseConnection = {
    type: "sqlite",
    database: "/path/to/db.sqlite",
  };

  const duckdbConnection: DatabaseConnection = {
    type: "duckdb",
    database: "data.duckdb",
    read_only: true,
  };

  const motherduckConnection: DatabaseConnection = {
    type: "motherduck",
    database: "my_db",
    token: "my_token",
  };

  const snowflakeConnection: DatabaseConnection = {
    type: "snowflake",
    account: "account",
    username: "user",
    password: "pass",
    warehouse: "warehouse",
    database: "db",
    schema: "schema",
    role: "role",
  };

  const bigqueryConnection: DatabaseConnection = {
    type: "bigquery",
    project: "my-project",
    dataset: "my_dataset",
    credentials_json: '{"type": "service_account", "project_id": "test"}',
  };

  const clickhouseConnection: DatabaseConnection = {
    type: "clickhouse_connect",
    host: "localhost",
    port: 8123,
    username: "user",
    password: "pass",
    secure: false,
  };

  const timeplusConnection: DatabaseConnection = {
    type: "timeplus",
    host: "localhost",
    port: 8123,
    username: "default",
    password: "",
  };

  const chdbConnection: DatabaseConnection = {
    type: "chdb",
    database: "file:///path/to/db.chdb",
    read_only: false,
  };

  const trinoConnection: DatabaseConnection = {
    type: "trino",
    host: "localhost",
    port: 8080,
    database: "test",
    username: "user",
    password: "pass",
    async_support: false,
  };

  const icebergRestConnection: DatabaseConnection = {
    type: "iceberg",
    name: "my_catalog",
    catalog: {
      type: "REST",
      uri: "http://localhost:8181",
      warehouse: "/path/to/warehouse",
    },
  };

  const icebergSqlConnection: DatabaseConnection = {
    type: "iceberg",
    name: "my_catalog",
    catalog: {
      type: "SQL",
      uri: "postgresql://localhost:5432/iceberg",
      warehouse: "/path/to/warehouse",
    },
  };

  const icebergHiveConnection: DatabaseConnection = {
    type: "iceberg",
    name: "my_catalog",
    catalog: {
      type: "Hive",
      uri: "thrift://localhost:9083",
      warehouse: "/path/to/warehouse",
    },
  };

  const icebergGlueConnection: DatabaseConnection = {
    type: "iceberg",
    name: "my_catalog",
    catalog: {
      type: "Glue",
      warehouse: "/path/to/warehouse",
    },
  };

  const icebergDynamoDBConnection: DatabaseConnection = {
    type: "iceberg",
    name: "my_catalog",
    catalog: {
      type: "DynamoDB",
      "dynamodb.profile-name": "my_profile",
      "dynamodb.region": "us-east-1",
      "dynamodb.access-key-id": "my_access_key_id",
      "dynamodb.secret-access-key": "my_secret_access_key",
      "dynamodb.session-token": "my_session_token",
    },
  };

  const datafusionConnection: DatabaseConnection = {
    type: "datafusion",
    sessionContext: false,
  };

  const datafusionConnSession: DatabaseConnection = {
    type: "datafusion",
    sessionContext: true,
  };

  const pysparkConnection: DatabaseConnection = {
    type: "pyspark",
  };

  const pysparkConnSession: DatabaseConnection = {
    type: "pyspark",
    host: "localhost",
    port: 15_002,
  };

  const redshiftDBConnection: DatabaseConnection = {
    type: "redshift",
    host: "localhost",
    port: 5439,
    database: "test",
    connectionType: {
      type: "DB credentials",
      user: "my_user",
      password: "my_password",
    },
  };

  const redshiftIAMConnection: DatabaseConnection = {
    type: "redshift",
    host: "localhost",
    port: 5439,
    database: "test",
    connectionType: {
      type: "IAM credentials",
      aws_access_key_id: "my_access_key_id",
      aws_secret_access_key: "my_secret_access_key",
      aws_session_token: "my_session_token",
      region: "ap-southeast-1",
    },
  };

  describe("basic connections", () => {
    const testCases: Array<[string, DatabaseConnection, ConnectionLibrary]> = [
      ["postgres with SQLModel", basePostgres, "sqlmodel"],
      ["postgres with SQLAlchemy", basePostgres, "sqlalchemy"],
      ["mysql with SQLModel", baseMysql, "sqlmodel"],
      ["mysql with SQLAlchemy", baseMysql, "sqlalchemy"],
      ["sqlite", sqliteConnection, "sqlmodel"],
      ["duckdb", duckdbConnection, "duckdb"],
      ["motherduck", motherduckConnection, "duckdb"],
      ["snowflake", snowflakeConnection, "sqlmodel"],
      ["bigquery", bigqueryConnection, "sqlmodel"],
      ["clickhouse", clickhouseConnection, "clickhouse_connect"],
      ["chdb", chdbConnection, "chdb"],
      ["timeplus", timeplusConnection, "sqlalchemy"],
      ["trino", trinoConnection, "sqlmodel"],
      ["iceberg rest", icebergRestConnection, "pyiceberg"],
      ["iceberg sql", icebergSqlConnection, "pyiceberg"],
      ["iceberg hive", icebergHiveConnection, "pyiceberg"],
      ["iceberg glue", icebergGlueConnection, "pyiceberg"],
      ["iceberg dynamodb", icebergDynamoDBConnection, "pyiceberg"],
      ["datafusion", datafusionConnection, "ibis"],
      ["datafusion with session", datafusionConnSession, "ibis"],
      ["pyspark", pysparkConnection, "ibis"],
      ["pyspark with session", pysparkConnSession, "ibis"],
      ["redshift with DB credentials", redshiftDBConnection, "redshift"],
      ["redshift with IAM credentials", redshiftIAMConnection, "redshift"],
    ];

    it.each(testCases)("%s", (name, connection, orm) => {
      expect(generateDatabaseCode(connection, orm)).toMatchSnapshot();
    });
  });

  describe("connections with secrets", () => {
    it.each([
      [
        "postgres with password as secret",
        {
          ...basePostgres,
          host: prefixSecret("ENV_HOST"),
          password: prefixSecret("ENV_PASSWORD"),
        },
        "sqlmodel",
      ],
      [
        "mysql with username and password as secrets",
        {
          ...baseMysql,
          username: prefixSecret("ENV_USER"),
          password: prefixSecret("ENV_PASSWORD"),
        },
        "sqlalchemy",
      ],
      [
        "snowflake with multiple secrets",
        {
          ...snowflakeConnection,
          username: prefixSecret("ENV_USER"),
          password: prefixSecret("ENV_PASSWORD"),
          account: prefixSecret("ENV_ACCOUNT"),
        },
        "sqlmodel",
      ],
      [
        "bigquery with credentials as secret",
        {
          ...bigqueryConnection,
          project: prefixSecret("ENV_PROJECT"),
          dataset: prefixSecret("ENV_DATASET"),
        },
        "sqlmodel",
      ],
      [
        "clickhouse with all connection details as secrets",
        {
          ...clickhouseConnection,
          host: prefixSecret("ENV_HOST"),
          username: prefixSecret("ENV_USER"),
          password: prefixSecret("ENV_PASSWORD"),
        },
        "clickhouse_connect",
      ],
      [
        "timeplus with all connection details as secrets",
        {
          ...timeplusConnection,
          host: prefixSecret("ENV_HOST"),
          username: prefixSecret("ENV_USER"),
          password: prefixSecret("ENV_PASSWORD"),
        },
        "sqlalchemy",
      ],
      [
        "motherduck with token as secret",
        {
          ...motherduckConnection,
          token: prefixSecret("ENV_TOKEN"),
        },
        "duckdb",
      ],
    ])("%s", (name, connection, orm) => {
      expect(
        generateDatabaseCode(connection, orm as ConnectionLibrary),
      ).toMatchSnapshot();
    });
  });

  describe("edge cases", () => {
    const testCases: Array<[string, DatabaseConnection, string]> = [
      [
        "ENV with special chars SQLModel",
        {
          ...basePostgres,
          password: "pass@#$%^&*",
          username: "user-name.special",
          database: "test-db.special",
        },
        "sqlmodel",
      ],
      [
        "postgres with special chars SQLAlchemy",
        {
          ...basePostgres,
          password: "pass@#$%^&*",
          username: "user-name.special",
          database: "test-db.special",
        },
        "sqlalchemy",
      ],
      [
        "snowflake with minimal config SQLModel",
        {
          type: "snowflake",
          account: "account",
          username: "user",
          password: "pass",
          database: "db",
          warehouse: "",
          schema: "",
          role: "",
        },
        "sqlmodel",
      ],
      [
        "clickhouse connect with minimal config",
        {
          ...clickhouseConnection,
          port: undefined,
          password: undefined,
        },
        "clickhouse_connect",
      ],
      [
        "timeplus connect with minimal config",
        {
          ...timeplusConnection,
          port: undefined,
          password: "",
        },
        "sqlalchemy",
      ],
      [
        "postgres with unicode",
        {
          ...basePostgres,
          database: "测试数据库",
          username: "用户",
          password: "密码",
        },
        "sqlmodel",
      ],
      [
        "bigquery with long credentials",
        {
          ...bigqueryConnection,
          credentials_json: "x".repeat(10),
        },
        "sqlmodel",
      ],
      [
        "sqlite with empty path",
        {
          type: "sqlite",
          // sqlite allows empty path
          database: "",
        },
        "sqlmodel",
      ],
      [
        "postgres with IPv6",
        {
          ...basePostgres,
          host: "2001:0db8:85a3:0000:0000:8a2e:0370:7334",
        },
        "sqlmodel",
      ],
      [
        "postgres with non-standard port",
        {
          ...basePostgres,
          port: 54_321,
        },
        "sqlmodel",
      ],
      [
        "mysql with max port",
        {
          ...baseMysql,
          port: 65_535,
        },
        "sqlmodel",
      ],
      [
        "postgres with URL-encoded characters",
        {
          ...basePostgres,
          database: "test%20db",
          username: "user%20name",
          password: "pass%20word",
        },
        "sqlmodel",
      ],
      [
        "mysql with extremely long database name",
        {
          ...baseMysql,
          database: "x".repeat(64),
        },
        "sqlmodel",
      ],
      [
        "snowflake with all optional fields filled",
        {
          type: "snowflake",
          account: "org-account",
          username: "user",
          password: "pass",
          database: "db",
          warehouse: "compute_wh",
          schema: "public",
          role: "accountadmin",
        },
        "sqlmodel",
      ],
      [
        "duckdb with relative path",
        {
          type: "duckdb",
          database: "./relative/path/db.duckdb",
          read_only: false,
        },
        "sqlmodel",
      ],
      [
        "postgres with domain socket",
        {
          ...basePostgres,
          host: "/var/run/postgresql",
          port: undefined,
        },
        "sqlmodel",
      ],
      [
        "clickhouse with no port",
        {
          ...clickhouseConnection,
          port: undefined,
        },
        "clickhouse_connect",
      ],
      [
        "clickhouse with https",
        {
          ...clickhouseConnection,
          secure: true,
        },
        "clickhouse_connect",
      ],
      [
        "timeplus with no port",
        {
          ...timeplusConnection,
          port: undefined,
        },
        "sqlalchemy",
      ],
      [
        "chdb with no database",
        {
          ...chdbConnection,
          database: "",
        },
        "chdb",
      ],
      [
        "trino with async support",
        {
          ...trinoConnection,
          async_support: true,
        },
        "sqlalchemy",
      ],
      [
        "motherduck with special chars in database name",
        {
          ...motherduckConnection,
          database: "test-db.special",
        },
        "duckdb",
      ],
    ];

    it.each(testCases)("%s", (name, connection, orm) => {
      expect(
        generateDatabaseCode(connection, orm as ConnectionLibrary),
      ).toMatchSnapshot();
    });
  });

  describe("security cases", () => {
    it.each([
      [
        "postgres with empty password",
        {
          ...basePostgres,
          password: "",
        },
      ],
      [
        "mysql with very long password",
        {
          ...baseMysql,
          password: "x".repeat(10),
        },
      ],
      [
        "postgres with SQL injection attempt in database name",
        {
          ...basePostgres,
          database: "db'; DROP TABLE users;--",
        },
      ],
      [
        "snowflake with sensitive info in account",
        {
          ...snowflakeConnection,
          account: "account-with-password123",
        },
      ],
      [
        "bigquery with malformed JSON",
        {
          ...bigqueryConnection,
          credentials_json: '{"type": "service_account", "project_id": "test"',
        },
      ],
    ])("%s", (name, connection) => {
      expect(generateDatabaseCode(connection, "sqlmodel")).toMatchSnapshot();
      expect(generateDatabaseCode(connection, "sqlalchemy")).toMatchSnapshot();
    });
  });

  describe("invalid cases", () => {
    it.each([
      [
        "throws for unsupported ORMs",
        () =>
          // @ts-expect-error - Testing invalid input
          generateDatabaseCode(basePostgres, "polars"),
      ],
      [
        "throws for invalid port",
        () => generateDatabaseCode({ ...basePostgres, port: -1 }, "sqlmodel"),
      ],
      [
        "throws for invalid host",
        () => generateDatabaseCode({ ...basePostgres, host: "" }, "sqlmodel"),
      ],
      [
        "throws for port out of range",
        () =>
          generateDatabaseCode({ ...basePostgres, port: 65_536 }, "sqlmodel"),
      ],
      [
        "throws for invalid snowflake account",
        () =>
          generateDatabaseCode(
            { ...snowflakeConnection, account: "" },
            "sqlmodel",
          ),
      ],
      [
        "throws for invalid bigquery project",
        () =>
          generateDatabaseCode(
            { ...bigqueryConnection, project: "" },
            "sqlmodel",
          ),
      ],
    ])("%s", (name, fn) => {
      expect(fn).toThrow();
    });
  });
});
