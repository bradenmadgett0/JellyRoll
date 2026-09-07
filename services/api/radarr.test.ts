import MockAdapter from "axios-mock-adapter";
import { RadarrClient } from "./radarr";
import { makeServerConfig } from "@/test/fixtures";

function makeClient() {
  const server = makeServerConfig({ type: "radarr", apiKey: "radarr-key" });
  const client = new RadarrClient(server);
  const mock = new MockAdapter(client["client"]);
  return { client, mock, server };
}

describe("RadarrClient — addMovie", () => {
  it("applies sensible defaults that the caller can override", async () => {
    const { client, mock } = makeClient();
    let body: any;
    mock.onPost("/movie").reply((config) => {
      body = JSON.parse(config.data);
      return [201, body];
    });

    await client.addMovie({
      tmdbId: 123,
      title: "Dio the Invader",
      qualityProfileId: 1,
      rootFolderPath: "/movies",
    });

    expect(body).toMatchObject({
      tmdbId: 123,
      title: "Dio the Invader",
      monitored: true,
      minimumAvailability: "released",
      addOptions: { searchForMovie: true },
    });
  });

  it("lets an explicit monitored/minimumAvailability override the default", async () => {
    const { client, mock } = makeClient();
    let body: any;
    mock.onPost("/movie").reply((config) => {
      body = JSON.parse(config.data);
      return [201, body];
    });

    await client.addMovie({
      tmdbId: 123,
      title: "Dio the Invader",
      qualityProfileId: 1,
      rootFolderPath: "/movies",
      monitored: false,
      minimumAvailability: "announced",
    });

    expect(body.monitored).toBe(false);
    expect(body.minimumAvailability).toBe("announced");
  });
});

describe("RadarrClient — deleteMovie", () => {
  it("defaults deleteFiles to false and always excludes import exclusion", async () => {
    const { client, mock } = makeClient();
    mock.onDelete("/movie/42").reply((config) => {
      expect(config.params).toEqual({
        deleteFiles: false,
        addImportExclusion: false,
      });
      return [200, {}];
    });
    await client.deleteMovie(42);
  });

  it("passes deleteFiles through when true", async () => {
    const { client, mock } = makeClient();
    mock.onDelete("/movie/42").reply((config) => {
      expect(config.params.deleteFiles).toBe(true);
      return [200, {}];
    });
    await client.deleteMovie(42, true);
  });
});

describe("RadarrClient — commands", () => {
  it("refreshMovie omits movieId from the body when not given", async () => {
    const { client, mock } = makeClient();
    let body: any;
    mock.onPost("/command").reply((config) => {
      body = JSON.parse(config.data);
      return [200, body];
    });
    await client.refreshMovie();
    expect(body).toEqual({ name: "RefreshMovie" });
  });

  it("refreshMovie includes movieId when given", async () => {
    const { client, mock } = makeClient();
    let body: any;
    mock.onPost("/command").reply((config) => {
      body = JSON.parse(config.data);
      return [200, body];
    });
    await client.refreshMovie(7);
    expect(body).toEqual({ name: "RefreshMovie", movieId: 7 });
  });

  it("searchMovie sends the movieIds array under MoviesSearch", async () => {
    const { client, mock } = makeClient();
    let body: any;
    mock.onPost("/command").reply((config) => {
      body = JSON.parse(config.data);
      return [200, body];
    });
    await client.searchMovie([1, 2, 3]);
    expect(body).toEqual({ name: "MoviesSearch", movieIds: [1, 2, 3] });
  });
});

describe("RadarrClient — getMovieImageUrl", () => {
  it("defaults to the poster cover type and includes the api key", () => {
    const { client, server } = makeClient();
    expect(client.getMovieImageUrl(42)).toBe(
      `${server.url}/api/v3/MediaCover/42/poster.jpg?apikey=${server.apiKey}`,
    );
  });

  it("accepts a different cover type", () => {
    const { client, server } = makeClient();
    expect(client.getMovieImageUrl(42, "fanart")).toBe(
      `${server.url}/api/v3/MediaCover/42/fanart.jpg?apikey=${server.apiKey}`,
    );
  });
});
