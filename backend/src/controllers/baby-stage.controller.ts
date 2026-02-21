import { Request, Response } from 'express';
import { BabyStageService } from '../services/baby-stage.service';

const service = new BabyStageService();

export class BabyStageController {
  getAll = async (_req: Request, res: Response) => {
    const stages = await service.getAll();
    res.json({ code: 200, message: 'success', data: stages });
  };

  getByStage = async (req: Request, res: Response) => {
    const stage = await service.getByStage(req.params.stage);
    if (!stage) return res.status(404).json({ code: 404, message: '阶段不存在', data: null });
    res.json({ code: 200, message: 'success', data: stage });
  };

  getByAge = async (req: Request, res: Response) => {
    const months = parseInt(req.params.months);
    if (isNaN(months)) return res.status(400).json({ code: 400, message: '月龄格式错误', data: null });
    const stage = await service.getByAge(months);
    res.json({ code: 200, message: 'success', data: stage });
  };

  getRecipes = async (req: Request, res: Response) => {
    const recipes = await service.getRecipesByStage(req.params.stage, {
      first_intro: req.query.first_intro === 'true',
      scene_tag: req.query.scene_tag as string,
      nutrient: req.query.nutrient as string,
      limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
    });
    res.json({ code: 200, message: 'success', data: recipes });
  };
}
