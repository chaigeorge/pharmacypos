const prisma = require('../config/prisma');

const getSettings = async (req, res) => {
  try {
    const settings = await prisma.setting.findMany();
    const map = settings.reduce((acc, s) => ({ ...acc, [s.key]: s.value }), {});
    res.json({ settings: map });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
};

const updateSettings = async (req, res) => {
  try {
    const updates = req.body; // { key: value, ... }
    for (const [key, value] of Object.entries(updates)) {
      await prisma.setting.upsert({
        where: { key },
        update: { value: String(value) },
        create: { key, value: String(value) },
      });
    }
    res.json({ message: 'Settings updated' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update settings' });
  }
};

module.exports = { getSettings, updateSettings };
