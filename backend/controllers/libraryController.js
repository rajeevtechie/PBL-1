const db = require('../config/db');

// --- 1. SAVE UPLOADED PDF TO DATABASE (LONGBLOB) ---
exports.saveFile = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });
    if (!req.file) return res.status(400).json({ message: 'File is required.' });

    const title = (req.body?.title || '').trim();
    const category = (req.body?.category || 'General').trim(); 
    
    if (!title) return res.status(400).json({ message: 'Title is required.' });

    // The raw PDF bytes from multer memory storage
    const fileData = req.file.buffer; 

    await db.execute(
      `INSERT INTO library_items (user_id, title, type, category, file_data)
       VALUES (?, ?, ?, ?, ?)`
      , [userId, title, 'file', category, fileData]
    );

    res.status(201).json({ message: 'File saved securely to database.' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to save file.', error: error.message });
  }
};

// --- 2. SAVE GENERATED CONTENT (QUIZZES/NOTES) ---
exports.saveContent = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const title = (req.body?.title || '').trim();
    const type = req.body?.type;
    const content = req.body?.content;
    const category = (req.body?.category || 'General').trim();

    if (!title || !type || !content) {
      return res.status(400).json({ message: 'Missing required fields.' });
    }

    await db.execute(
      `INSERT INTO library_items (user_id, title, type, category, content)
       VALUES (?, ?, ?, ?, ?)`
      , [userId, title, type, category, JSON.stringify(content)]
    );

    res.status(201).json({ message: 'Content saved to library.' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to save content.', error: error.message });
  }
};

// --- 3. GET ALL LIBRARY ITEMS (For the Split-View Library) ---
exports.getLibraryItems = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    // IMPORTANT: DO NOT select file_data here to prevent massive payload crashes!
    const [rows] = await db.execute(
      `SELECT id, title, type, category, content, DATE_FORMAT(created_at, "%m/%d/%Y") as created_at
       FROM library_items
       WHERE user_id = ?
       ORDER BY created_at DESC`,
      [userId]
    );

    // Safely parse JSON for generated content
    const parsed = rows.map((row) => {
      if (!row.content) return { ...row, content: null };
      
      let finalContent = row.content;
      if (typeof finalContent === 'string') {
          try {
            finalContent = JSON.parse(finalContent);
          } catch (parseError) {
            console.error(`Failed to parse content for item ${row.id}`);
            finalContent = row.content; 
          }
      }
      return { ...row, content: finalContent };
    });

    res.status(200).json(parsed);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch items.' });
  }
};

// --- 4. SERVE RAW PDF BYTES (For the Split-Screen Viewer) ---
exports.serveFile = async (req, res) => {
    try {
        const userId = req.user.id;
        const fileId = req.params.id;

        const [rows] = await db.execute(
            'SELECT file_data, title FROM library_items WHERE id = ? AND user_id = ?',
            [fileId, userId]
        );

        if (rows.length === 0 || !rows[0].file_data) {
            return res.status(404).json({ message: "File not found or no PDF data available." });
        }

        res.contentType('application/pdf');
        res.setHeader('Content-Disposition', `inline; filename="${rows[0].title}.pdf"`);
        res.send(rows[0].file_data);

    } catch (error) {
        res.status(500).json({ message: "Failed to serve PDF" });
    }
};

// --- 5. DELETE ITEM ---
exports.deleteItem = async (req, res) => {
    try {
      const userId = req.user?.id;
      const itemId = Number(req.params.id);
      
      // Since we are no longer using the file system (fs.unlink), we just delete the database row!
      await db.execute(`DELETE FROM library_items WHERE id = ? AND user_id = ?`, [itemId, userId]);
      
      res.status(200).json({ message: 'Item deleted.' });
    } catch (error) {
      res.status(500).json({ message: 'Failed to delete.' });
    }
};