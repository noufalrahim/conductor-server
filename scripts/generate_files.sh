#!/bin/sh

NAME="$1"

FIRST="$(printf "%s" "$NAME" | cut -c1 | tr 'a-z' 'A-Z')"
REST="$(printf "%s" "$NAME" | cut -c2-)"
PASCAL_NAME="${FIRST}${REST}"
LOWER_NAME="$(printf "%s" "$NAME" | tr 'A-Z' 'a-z')"
KEBAB_NAME="$(printf "%s" "$NAME" | sed 's/\([A-Z]\)/-\1/g' | sed 's/^-//' | tr 'A-Z' 'a-z')"

ENTITY_FILE="${PASCAL_NAME}Entity"
INTERFACE_FILE="I${PASCAL_NAME}Repository"
REPO_IMPL_FILE="${PASCAL_NAME}Repository"
CONTROLLER_FILE="${PASCAL_NAME}Controller"
ROUTER_FILE="${KEBAB_NAME}.router"

ENTITY_PATH="../src/domain/entities/${ENTITY_FILE}.ts"
INTERFACE_PATH="../src/domain/repositories/${INTERFACE_FILE}.ts"
REPO_IMPL_PATH="../src/infrastructure/repositories/${REPO_IMPL_FILE}.ts"
CONTROLLER_PATH="../src/controllers/${CONTROLLER_FILE}.ts"
ROUTER_PATH="../src/routes/${ROUTER_FILE}.ts"

mkdir -p ../src/domain/entities
mkdir -p ../src/domain/repositories
mkdir -p ../src/infrastructure/repositories
mkdir -p ../src/controllers
mkdir -p ../src/routes

# ---------------- ENTITY ----------------
cat > "$ENTITY_PATH" <<EOF
export class ${PASCAL_NAME} {
  constructor(
    public _id?: string
  ) {}
}
EOF

# ---------------- REPOSITORY INTERFACE ----------------
cat > "$INTERFACE_PATH" <<EOF
import { ${PASCAL_NAME} } from "../entities/${ENTITY_FILE}";

export interface I${PASCAL_NAME}Repository {
  create(${LOWER_NAME}: ${PASCAL_NAME}): Promise<${PASCAL_NAME}>;
  find(): Promise<${PASCAL_NAME}[]>;
  findById(id: string): Promise<${PASCAL_NAME} | null>;
  update(id: string, data: Partial<${PASCAL_NAME}>): Promise<${PASCAL_NAME} | null>;
  delete(id: string): Promise<boolean>;
}
EOF

# ---------------- REPOSITORY IMPLEMENTATION ----------------
cat > "$REPO_IMPL_PATH" <<EOF
import { Schema, model, models } from "mongoose";
import { ${PASCAL_NAME} } from "../../domain/entities/${ENTITY_FILE}";
import { I${PASCAL_NAME}Repository } from "../../domain/repositories/${INTERFACE_FILE}";

const ${LOWER_NAME}Schema = new Schema({}, { timestamps: true });

const ${PASCAL_NAME}Model =
  models.${PASCAL_NAME} || model("${PASCAL_NAME}", ${LOWER_NAME}Schema);

export class ${PASCAL_NAME}Repository implements I${PASCAL_NAME}Repository {
  async create(${LOWER_NAME}: ${PASCAL_NAME}): Promise<${PASCAL_NAME}> {
    return await ${PASCAL_NAME}Model.create(${LOWER_NAME});
  }

  async find(): Promise<${PASCAL_NAME}[]> {
    return await ${PASCAL_NAME}Model.find();
  }

  async findById(id: string): Promise<${PASCAL_NAME} | null> {
    return await ${PASCAL_NAME}Model.findById(id);
  }

  async update(id: string, data: Partial<${PASCAL_NAME}>): Promise<${PASCAL_NAME} | null> {
    return await ${PASCAL_NAME}Model.findByIdAndUpdate(id, data, { new: true });
  }

  async delete(id: string): Promise<boolean> {
    const res = await ${PASCAL_NAME}Model.findByIdAndDelete(id);
    return !!res;
  }
}
EOF

# ---------------- CONTROLLER ----------------
cat > "$CONTROLLER_PATH" <<EOF
import { connectDB } from "../infrastructure/db/connect";
import { ${PASCAL_NAME}Repository } from "../infrastructure/repositories/${REPO_IMPL_FILE}";
import { ${PASCAL_NAME} } from "../domain/entities/${ENTITY_FILE}";

export class ${PASCAL_NAME}Controller {
  private repo = new ${PASCAL_NAME}Repository();

  async create(data: ${PASCAL_NAME}) {
    await connectDB();
    const result = await this.repo.create(data);
    return { success: true, data: result };
  }

  async findAll() {
    await connectDB();
    const result = await this.repo.find();
    return { success: true, data: result };
  }

  async findById(id: string) {
    await connectDB();
    const result = await this.repo.findById(id);
    return { success: true, data: result };
  }

  async update(id: string, data: Partial<${PASCAL_NAME}>) {
    await connectDB();
    const result = await this.repo.update(id, data);
    return { success: true, data: result };
  }

  async delete(id: string) {
    await connectDB();
    const result = await this.repo.delete(id);
    return { success: true, data: result };
  }
}
EOF

# ---------------- EXPRESS ROUTER ----------------
cat > "$ROUTER_PATH" <<EOF
import { Router, Request, Response } from "express";
import { ${PASCAL_NAME}Controller } from "../controllers/${CONTROLLER_FILE}";

const router = Router();
const controller = new ${PASCAL_NAME}Controller();

router.post("/", async (req: Request, res: Response) => {
  const result = await controller.create(req.body);
  res.status(201).json(result);
});

router.get("/", async (_req: Request, res: Response) => {
  const result = await controller.findAll();
  res.json(result);
});

router.get("/:id", async (req: Request, res: Response) => {
  const result = await controller.findById(req.params.id);
  res.json(result);
});

router.put("/:id", async (req: Request, res: Response) => {
  const result = await controller.update(req.params.id, req.body);
  res.json(result);
});

router.delete("/:id", async (req: Request, res: Response) => {
  const result = await controller.delete(req.params.id);
  res.json(result);
});

export default router;
EOF

echo "Generated clean Node.js CRUD for: ${PASCAL_NAME}"
