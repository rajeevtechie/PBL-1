const path = require('path');
const fs = require('fs');
const db = require('../config/db');
const { LIBRARY_ITEM_TYPES, LIBRARY_ITEM_CATEGORIES } = require('../models/LibraryItem');

const isValidType = (type) => LIBRARY_ITEM_TYPES.includes(type);
const isValidCategory = (category) => LIBRARY_ITEM_CATEGORIES.includes(category);

exports.saveFile = async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'File is required.' });
    }

    const title = (req.body?.title || '').trim();
    if (!title) {
      return res.status(400).json({ message: 'Title is required.' });
    }

    const fileUrl = `/uploads/${req.file.filename}`;

    await db.execute(
      `INSERT INTO library_items (user_id, title, type, category, file_url, content)
       VALUES (?, ?, ?, ?, ?, ?)`
      , [userId, title, 'file', 'uploaded', fileUrl, null]
    );

    res.status(201).json({
      message: 'File saved to library.',
      fileUrl
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to save file.', error: error.message });
  }
};

exports.saveContent = async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const title = (req.body?.title || '').trim();
    const type = req.body?.type;
    const content = req.body?.content;

    if (!title) {
      return res.status(400).json({ message: 'Title is required.' });
    }

    if (!type || !isValidType(type) || type === 'file') {
      return res.status(400).json({ message: 'Invalid content type.' });
    }

    if (!content) {
      return res.status(400).json({ message: 'Content is required.' });
    }

    await db.execute(
      `INSERT INTO library_items (user_id, title, type, category, file_url, content)
       VALUES (?, ?, ?, ?, ?, ?)`
      , [userId, title, type, 'generated', null, JSON.stringify(content)]
    );

    res.status(201).json({ message: 'Content saved to library.' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to save content.', error: error.message });
  }
};

exports.getUploaded = async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const [rows] = await db.execute(
      `SELECT id, title, type, category, file_url, created_at
       FROM library_items
       WHERE user_id = ? AND category = 'uploaded'
       ORDER BY created_at DESC`,
      [userId]
    );

    res.status(200).json(rows);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch uploaded items.', error: error.message });
  }
};

exports.getGenerated = async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const [rows] = await db.execute(
      `SELECT id, title, type, category, content, created_at
       FROM library_items
       WHERE user_id = ? AND category = 'generated'
       ORDER BY created_at DESC`,
      [userId]
    );

    const parsed = rows.map((row) => {
      // 1. If it's already null, return safely
      if (!row.content) {
        return { ...row, content: null };
      }

      let finalContent = row.content;

      // 2. ONLY parse if it arrived as a string. 
      // If the MySQL driver already converted it to an object, leave it alone!
      if (typeof finalContent === 'string') {
        try {
          finalContent = JSON.parse(finalContent);
        } catch (parseError) {
          console.error(`Failed to parse content for item ${row.id}`);
          finalContent = null; 
        }
      }

      return { ...row, content: finalContent };
    });

    res.status(200).json(parsed);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch generated items.', error: error.message });
  }
};

exports.deleteItem = async (req, res) => {
  try {
    const userId = req.user?.id;
    const itemId = Number(req.params.id);

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    if (!itemId) {
      return res.status(400).json({ message: 'Invalid item id.' });
    }

    const [rows] = await db.execute(
      `SELECT id, category, file_url FROM library_items WHERE id = ? AND user_id = ?`,
      [itemId, userId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Item not found.' });
    }

    const item = rows[0];
    if (item.category === 'uploaded' && item.file_url) {
      const filePath = path.join(__dirname, '..', item.file_url);
      fs.unlink(filePath, () => {});
    }

    await db.execute(`DELETE FROM library_items WHERE id = ? AND user_id = ?`, [itemId, userId]);

    res.status(200).json({ message: 'Item deleted.' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete item.', error: error.message });
  }
};