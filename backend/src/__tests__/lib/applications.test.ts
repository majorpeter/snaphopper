import { Applications } from "../../lib/applications";

type MockApp = { name: string; services?: string[]; snapshots?: string[] };

function getMockDockerComposeFile(app: MockApp) {
  let s = "services:\n";
  if (app.services) {
    for (const service of app.services) {
      s += `  ${service}:\n`;
    }
  }
  return s;
}

function getMockApplications(params: {
  path: string;
  apps: MockApp[];
}): Applications {
  const apps = new Applications();
  apps.setPath(params.path);
  apps.setAdapter(
    async (command, args, _options) => {
      switch (command) {
        case "ls":
          if (args.includes("-F1") && args.includes(params.path)) {
            return params.apps.map((v) => v.name).join("/\n") + "/\n";
          }
          break;
        case "cat":
          if (args[0].startsWith(params.path)) {
            let filepath = args[0].substring(params.path.length + 1);
            if (
              params.apps.map((v) => v.name).includes(filepath.split("/")[0])
            ) {
              const appname = filepath.substring(0, filepath.indexOf("/"));
              filepath = filepath.substring(filepath.indexOf("/") + 1);
              const app = params.apps.find((v) => v.name == appname);
              if (app) {
                if (filepath == "docker-compose.yml") {
                  return getMockDockerComposeFile(app);
                }
                if (filepath.startsWith(".zfs/snapshot/")) {
                  filepath = filepath.substring(".zfs/snapshot/".length);
                  const snapshot = filepath.split("/")[0];
                  if (app.snapshots && app.snapshots.includes(snapshot)) {
                    filepath = filepath.substring(snapshot.length + 1);
                    if (filepath == "docker-compose.yml") {
                      return getMockDockerComposeFile(app);
                    }
                  }
                }
              }
            }
            throw new Error("file not found: " + args[0]);
          }
      }
      return "";
    },
    async (command_line, onStdout) => {
      return () => {};
    }
  );
  return apps;
}

describe("applications tests", () => {
  test("projects listing", async () => {
    const apps = getMockApplications({
      path: "/mnt/data/apps",
      apps: [{ name: "test1" }, { name: "test2" }, { name: "mock" }],
    });

    expect((await apps.getProjectFolders()).sort()).toEqual(
      ["mock", "test1", "test2"].sort()
    );

    expect(await apps.projectExists("test1")).toBeTruthy();
    expect(await apps.projectExists("nonexistent")).toBeFalsy();
  });

  test("projectfile text secure", async () => {
    const apps = getMockApplications({
      path: "/mnt/data/apps",
      apps: [
        {
          name: "test1",
          services: ["srv1", "srv2"],
          snapshots: ["compose-2025-01-01"],
        },
        { name: "test2" },
        { name: "mock" },
      ],
    });

    expect(apps.getProjectFileText("nonexistent")).resolves.toBeNull();
    expect(apps.getProjectFileText("test1")).resolves.toBeTruthy();
    expect(
      await apps.getProjectFileText("test1", "compose-2025-01-01")
    ).toBeTruthy();
    expect(await apps.getProjectFileText("test1", "nonexistent")).toBeNull();
    expect(() =>
      apps.getProjectFileText("../../exploited-path")
    ).rejects.toThrow();
    expect(() =>
      apps.getProjectFileText("test1", "../../exploited-path")
    ).rejects.toThrow();
  });
});
