const major = Number.parseInt(process.versions.node.split(".")[0], 10);

if (major !== 24) {
  console.error(
    `This repository requires Node 24.x. Current version: ${process.versions.node}.`
  );
  process.exit(1);
}
