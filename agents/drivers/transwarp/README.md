# Transwarp Inceptor JDBC Agent

This agent uses the same bundled JDBC packaging as the OSCAR, Cache, and UXDB
agents. Gradle includes `libs/inceptor-sdk-transwarp-6.1.0-SNAPSHOT.jar` in
`dbx-agent-transwarp.jar`. Driver Manager installs that Agent and its Java runtime
through the existing Agent registry. Connections do not require external JAR
paths or the generic JDBC plugin.

The SDK was supplied with Waterdrop 2.0. Its SHA-256 is
`462b9c2d298ccea12e0fc903b764b63a915204fa0c7e34de6dc71884130ff184`.
Its filename does not identify the server version. Redistribution terms must be
confirmed before publishing this vendor binary. The [official JDBC guide](https://www.transwarp.cn/doc/inceptor/9.5/developer-guide--application-development--development-jdbc)
directs users to download the driver from Transwarp Manager; licenses bundled for the
SDK's third-party dependencies do not establish redistribution permission for
the Transwarp SDK itself.

New connections use the single `transwarp-inceptor` product profile. Existing
`argo` connections continue to use the Go Agent and are left unchanged. The default
URL is `jdbc:inceptor2://host:10000/default`; a supplied
`jdbc:transwarp2://` or `jdbc:hive2://` URL is also accepted by the SDK.
DBX preserves the server's configured SQL dialect. Waterdrop's selectable
server dialects are ORACLE, DB2, and TD; mysql is not a valid value. The Agent
sets session `transaction.type = inceptor` only before an explicit transaction;
ordinary DML on transactional ORC tables does not require that setting.

The agent reads Waterdrop's `system.*_v` catalog views for databases, tables,
views, columns, procedures, functions, packages, partitions, buckets, and
optional triggers. Table DDL is read from the server's `SHOW CREATE TABLE`
response; storage and bucket clauses must be checked on a live server before
relying on exported DDL for rebuilds.
Index and foreign-key lists are empty, matching Waterdrop's table metadata;
the SDK does not provide usable index introspection.

Database creation and the column-level structure editor are enabled. The
structure editor uses the live-verified `ADD COLUMNS (...)` and `CHANGE` forms.
`DROP COLUMN`, indexes, foreign keys, primary-key changes, and user
administration remain disabled until verified on both product families and
their supported server versions.
Database actions use `CREATE DATABASE IF NOT EXISTS` and `DROP DATABASE IF EXISTS`.
Ordinary non-transactional tables accept `INSERT ... SELECT`, but not row-wise
`INSERT ... VALUES`. UPDATE/DELETE and rollback require a transactional table.
Table import and transfer use `INSERT ... SELECT`; the data grid permits inserts
and enables updates/deletes only when the table is transactional. Native complex
columns require same-connection server-side copying for data transfer.
DBX does not silently change the storage format or transactional properties of
tables being created.

Run unit tests and the packaged SDK loading check from `agents/` with:

```powershell
$env:JAVA_HOME = 'C:\Program Files\Microsoft\jdk-21.0.10.7-hotspot'
.\gradlew.bat :transwarp:test :transwarp:shadowJar
```

The SDK loading check loads the built Agent in an isolated classloader, uses the
shared JDBC lifecycle without external driver paths, and checks its URL schemes.
It does not connect to a live server. Live acceptance still needs representative
ArgoDB and Inceptor servers for authentication, transaction rollback, catalog
permissions, and data type round trips.
