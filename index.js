import express from 'express';
import cors from 'cors';
import sqlite3 from 'sqlite3';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import fs from 'fs';

const app = express();
const PORT = 4000;

app.use(cors());
app.use(express.json());

const DB_FILE = './users.db';
const JWT_SECRET = 'your_jwt_secret'; // Change this in production

// Initialize SQLite DB
if (!fs.existsSync(DB_FILE)) {
  fs.writeFileSync(DB_FILE, '');
}
const db = new sqlite3.Database(DB_FILE);
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('super_admin', 'builder', 'consumer'))
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS projects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    price INTEGER NOT NULL,
    location TEXT NOT NULL,
    area INTEGER NOT NULL,
    bedrooms INTEGER NOT NULL,
    bathrooms INTEGER NOT NULL,
    type TEXT NOT NULL,
    status TEXT NOT NULL,
    images TEXT,
    description TEXT,
    amenities TEXT,
    seller_email TEXT NOT NULL,
    featured INTEGER DEFAULT 0,
    createdAt TEXT,
    coordinates TEXT
  )`);
});

// Sample property data (copied from frontend)
const sampleProperties = [
  {
    id: "1",
    title: "Luxury 3BHK Apartment in Prime Location",
    price: 8500000,
    location: "Bandra West, Mumbai",
    area: 1200,
    bedrooms: 3,
    bathrooms: 2,
    type: "apartment",
    status: "sale",
    images: [
      "https://images.unsplash.com/photo-1721322800607-8c38375eef04?w=800&h=600&fit=crop",
      "https://images.unsplash.com/photo-1487958449943-2429e8be8625?w=800&h=600&fit=crop",
      "https://images.unsplash.com/photo-1524230572899-a752b3835840?w=800&h=600&fit=crop"
    ],
    description: "Beautiful 3BHK apartment with modern amenities, prime location with easy access to transportation, shopping centers, and schools. Fully furnished with premium fittings.",
    amenities: ["Swimming Pool", "Gym", "Security", "Parking", "Garden", "Elevator"],
    seller: {
      name: "Rajesh Kumar",
      phone: "+91 9876543210",
      email: "rajesh@example.com",
      verified: true
    },
    featured: true,
    createdAt: "2024-01-15",
    coordinates: { lat: 19.0596, lng: 72.8295 }
  },
  {
    id: "2",
    title: "Spacious 2BHK for Rent in IT Hub",
    price: 35000,
    location: "Whitefield, Bangalore",
    area: 950,
    bedrooms: 2,
    bathrooms: 2,
    type: "apartment",
    status: "rent",
    images: [
      "https://images.unsplash.com/photo-1494891848038-7bd202a2afeb?w=800&h=600&fit=crop",
      "https://images.unsplash.com/photo-1721322800607-8c38375eef04?w=800&h=600&fit=crop"
    ],
    description: "Well-maintained 2BHK apartment in the heart of IT hub, close to tech parks, restaurants, and entertainment centers. Perfect for working professionals.",
    amenities: ["Parking", "Security", "Power Backup", "Internet Ready"],
    seller: {
      name: "Priya Sharma",
      phone: "+91 9876543211",
      email: "priya@example.com",
      verified: true
    },
    featured: false,
    createdAt: "2024-01-20"
  },
  {
    id: "3",
    title: "Independent Villa with Garden",
    price: 15000000,
    location: "Gurgaon Sector 42",
    area: 2500,
    bedrooms: 4,
    bathrooms: 3,
    type: "villa",
    status: "sale",
    images: [
      "https://images.unsplash.com/photo-1487958449943-2429e8be8625?w=800&h=600&fit=crop",
      "https://images.unsplash.com/photo-1524230572899-a752b3835840?w=800&h=600&fit=crop"
    ],
    description: "Luxurious independent villa with beautiful garden, spacious rooms, and modern architecture. Perfect for families looking for premium living.",
    amenities: ["Garden", "Parking", "Security", "Swimming Pool", "Servant Room"],
    seller: {
      name: "Amit Singh",
      phone: "+91 9876543212",
      email: "amit@example.com",
      verified: false
    },
    featured: true,
    createdAt: "2024-01-18"
  },
  {
    id: "4",
    title: "Modern 1BHK Studio Apartment",
    price: 25000,
    location: "Koramangala, Bangalore",
    area: 600,
    bedrooms: 1,
    bathrooms: 1,
    type: "apartment",
    status: "rent",
    images: [
      "https://images.unsplash.com/photo-1721322800607-8c38375eef04?w=800&h=600&fit=crop"
    ],
    description: "Compact and modern 1BHK studio apartment perfect for young professionals. Located in vibrant Koramangala with easy access to cafes, pubs, and offices.",
    amenities: ["Parking", "Security", "Elevator", "Internet Ready"],
    seller: {
      name: "Sneha Patel",
      phone: "+91 9876543213",
      email: "sneha@example.com",
      verified: true
    },
    featured: false,
    createdAt: "2024-01-22"
  },
  {
    id: "5",
    title: "Commercial Office Space",
    price: 5000000,
    location: "Connaught Place, Delhi",
    area: 800,
    bedrooms: 0,
    bathrooms: 2,
    type: "commercial",
    status: "sale",
    images: [
      "https://images.unsplash.com/photo-1494891848038-7bd202a2afeb?w=800&h=600&fit=crop"
    ],
    description: "Prime commercial office space in the heart of Delhi. Perfect for businesses looking for a prestigious address with excellent connectivity.",
    amenities: ["Parking", "Security", "Elevator", "Power Backup", "Conference Room"],
    seller: {
      name: "Rohit Agarwal",
      phone: "+91 9876543214",
      email: "rohit@example.com",
      verified: true
    },
    featured: false,
    createdAt: "2024-01-25"
  }
];

// Endpoint to get all properties
app.get('/api/properties', (req, res) => {
  db.all('SELECT * FROM projects', [], (err, rows) => {
    if (err) return res.status(500).json({ message: 'Error fetching properties.' });
    // Parse JSON fields
    const properties = rows.map(row => ({
      ...row,
      images: JSON.parse(row.images || '[]'),
      amenities: JSON.parse(row.amenities || '[]'),
      coordinates: row.coordinates ? JSON.parse(row.coordinates) : undefined,
      featured: !!row.featured
    }));
    res.json(properties);
  });
});

// Endpoint to get a property by ID
app.get('/api/properties/:id', (req, res) => {
  db.get('SELECT * FROM projects WHERE id = ?', [req.params.id], (err, row) => {
    if (err || !row) return res.status(404).json({ message: 'Property not found' });
    const property = {
      ...row,
      images: JSON.parse(row.images || '[]'),
      amenities: JSON.parse(row.amenities || '[]'),
      coordinates: row.coordinates ? JSON.parse(row.coordinates) : undefined,
      featured: !!row.featured
    };
    res.json(property);
  });
});

// Signup endpoint (with role)
app.post('/api/auth/signup', (req, res) => {
  const { email, password, role } = req.body;
  if (!email || !password || !role) {
    return res.status(400).json({ message: 'Email, password, and role are required.' });
  }
  if (!['builder', 'consumer', 'super_admin'].includes(role)) {
    return res.status(400).json({ message: 'Invalid role.' });
  }
  db.get('SELECT * FROM users WHERE email = ?', [email], (err, user) => {
    if (user) {
      return res.status(409).json({ message: 'User already exists.' });
    }
    const hashedPassword = bcrypt.hashSync(password, 10);
    db.run('INSERT INTO users (email, password, role) VALUES (?, ?, ?)', [email, hashedPassword, role], function (err) {
      if (err) return res.status(500).json({ message: 'Error creating user.' });
      return res.status(201).json({ message: 'User created successfully.' });
    });
  });
});

// Login endpoint
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required.' });
  }
  db.get('SELECT * FROM users WHERE email = ?', [email], (err, user) => {
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials.' });
    }
    if (!bcrypt.compareSync(password, user.password)) {
      return res.status(401).json({ message: 'Invalid credentials.' });
    }
    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '1d' });
    return res.json({ token, role: user.role });
  });
});

// Forgot password endpoint (mock, just checks if user exists)
app.post('/api/auth/forgot-password', (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ message: 'Email is required.' });
  }
  db.get('SELECT * FROM users WHERE email = ?', [email], (err, user) => {
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }
    // In a real app, send email with reset link/token
    return res.json({ message: 'Password reset instructions sent (mock).' });
  });
});

// Add project (builder only)
app.post('/api/projects', (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'No token provided.' });
  let user;
  try {
    user = jwt.verify(token, JWT_SECRET);
  } catch {
    return res.status(401).json({ message: 'Invalid token.' });
  }
  if (user.role !== 'builder') {
    return res.status(403).json({ message: 'Only builders can add projects.' });
  }
  const { title, price, location, area, bedrooms, bathrooms, type, status, images, description, amenities, featured, coordinates } = req.body;
  db.run(`INSERT INTO projects (title, price, location, area, bedrooms, bathrooms, type, status, images, description, amenities, seller_email, featured, createdAt, coordinates) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [title, price, location, area, bedrooms, bathrooms, type, status, JSON.stringify(images), description, JSON.stringify(amenities), user.email, featured ? 1 : 0, new Date().toISOString(), JSON.stringify(coordinates)],
    function (err) {
      if (err) return res.status(500).json({ message: 'Error adding project.' });
      return res.status(201).json({ message: 'Project added successfully.', id: this.lastID });
    }
  );
});

// Update project (builder only, own projects)
app.put('/api/projects/:id', (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'No token provided.' });
  let user;
  try {
    user = jwt.verify(token, JWT_SECRET);
  } catch {
    return res.status(401).json({ message: 'Invalid token.' });
  }
  if (user.role !== 'builder') {
    return res.status(403).json({ message: 'Only builders can update projects.' });
  }
  db.get('SELECT * FROM projects WHERE id = ?', [req.params.id], (err, project) => {
    if (!project || project.seller_email !== user.email) {
      return res.status(403).json({ message: 'Not allowed.' });
    }
    const { title, price, location, area, bedrooms, bathrooms, type, status, images, description, amenities, featured, coordinates } = req.body;
    db.run(`UPDATE projects SET title=?, price=?, location=?, area=?, bedrooms=?, bathrooms=?, type=?, status=?, images=?, description=?, amenities=?, featured=?, coordinates=? WHERE id=?`,
      [title, price, location, area, bedrooms, bathrooms, type, status, JSON.stringify(images), description, JSON.stringify(amenities), featured ? 1 : 0, JSON.stringify(coordinates), req.params.id],
      function (err) {
        if (err) return res.status(500).json({ message: 'Error updating project.' });
        return res.json({ message: 'Project updated successfully.' });
      }
    );
  });
});

// Delete project (builder only, own projects)
app.delete('/api/projects/:id', (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'No token provided.' });
  let user;
  try {
    user = jwt.verify(token, JWT_SECRET);
  } catch {
    return res.status(401).json({ message: 'Invalid token.' });
  }
  if (user.role !== 'builder') {
    return res.status(403).json({ message: 'Only builders can delete projects.' });
  }
  db.get('SELECT * FROM projects WHERE id = ?', [req.params.id], (err, project) => {
    if (!project || project.seller_email !== user.email) {
      return res.status(403).json({ message: 'Not allowed.' });
    }
    db.run('DELETE FROM projects WHERE id = ?', [req.params.id], function (err) {
      if (err) return res.status(500).json({ message: 'Error deleting project.' });
      return res.json({ message: 'Project deleted successfully.' });
    });
  });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
}); 